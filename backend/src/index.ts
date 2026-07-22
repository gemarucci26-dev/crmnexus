// NEXUS Lead System - Backend monolito
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { parse as parseCsv } from 'csv-parse/sync';
import XLSX from 'xlsx';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_secret';
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || 'nexus_refresh';
const PORT = Number(process.env.PORT) || 3001;

// ============ EVOLUTION API CONFIG ============

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

const configPath = path.join(process.cwd(), 'evolution-config.json');

function loadEvolutionConfig(): EvolutionConfig {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || '',
  };
}

function saveEvolutionConfig(config: EvolutionConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function sendWhatsAppMessage(to: string, text: string): Promise<{ ok: boolean; key?: { id: string; remoteJid: string }; error?: string }> {
  const config = loadEvolutionConfig();
  if (!config.apiKey || !config.instanceName) {
    return { ok: false, error: 'Evolution API não configurada. Configure em Configurações > WhatsApp.' };
  }
  const phone = to.replace(/\D/g, '');
  try {
    const url = `${config.apiUrl}/message/sendText/${config.instanceName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({ number: phone, text }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Evolution API ${res.status}: ${err}` };
    }
    const data = await res.json().catch(() => ({}));
    const key = data?.key || data?.messages?.[0]?.key;
    return { ok: true, key: key ? { id: key.id, remoteJid: key.remoteJid } : undefined };
  } catch (e: any) {
    return { ok: false, error: `Falha ao conectar Evolution API: ${e.message}` };
  }
}

async function deleteWhatsAppMessage(remoteJid: string, messageId: string): Promise<boolean> {
  const config = loadEvolutionConfig();
  if (!config.apiKey || !config.instanceName) return false;
  try {
    const url = `${config.apiUrl}/message/delete/${config.instanceName}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({ remoteJid, messageId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function calculateDelay(speed: number, index: number): number {
  const baseDelay = 60000 / speed;
  const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1);
  return Math.max(1000, baseDelay + jitter);
}

async function checkPhoneDedup(phone: string, campaignId: string, hoursAgo = 24): Promise<boolean> {
  const since = new Date(Date.now() - hoursAgo * 3600000);
  const count = await prisma.dispatch.count({
    where: {
      lead: { telefone: phone },
      status: { in: ['SENT', 'DELIVERED'] },
      createdAt: { gte: since },
      campaignId: { not: campaignId },
    },
  });
  return count > 0;
}

// Redis (fallback graceful)
let redis: Redis | null = null;
let dispatchQueue: Queue | null = null;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

function initRedis() {
  if (!process.env.REDIS_URL) {
    console.log('REDIS_URL não configurado - filas desativadas');
    return;
  }
  try {
    redis = new Redis(redisUrl, { 
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('Redis indisponível após 3 tentativas - filas desativadas');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      }
    });
    dispatchQueue = new Queue('dispatches', { connection: { url: redisUrl } });
    
    redis.on('connect', () => console.log('Redis conectado'));
    redis.on('error', (err) => {
      console.log('Redis erro:', err.message);
    });
    
    dispatchQueue.on('error', (err) => {
      console.log('Queue erro:', err.message);
    });
  } catch { 
    console.log('Redis indisponível - filas desativadas'); 
  }
}

initRedis();

// Tipos
interface AuthPayload { id: string; email: string; role: string; }
declare global { namespace Express { interface Request { user?: AuthPayload; } } }

// ============ MIDDLEWARES ============

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try { req.user = jwt.verify(token, JWT_SECRET) as AuthPayload; next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// ============ HELPERS ============

function replaceVars(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || `{${key}}`);
}

function signToken(payload: AuthPayload) {
  return { accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }), refreshToken: jwt.sign(payload, JWT_REFRESH, { expiresIn: '7d' }) };
}

function pid(req: express.Request): string { return String(req.params.id); }

// ============ AUTH ============

async function register(req: express.Request, res: express.Response) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, password: passwordHash } });
  const tokens = signToken({ id: user.id, email: user.email, role: user.role });
  await prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens });
}

async function login(req: express.Request, res: express.Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Credenciais inválidas' });
  const tokens = signToken({ id: user.id, email: user.email, role: user.role });
  await prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens });
}

async function refreshToken(req: express.Request, res: express.Response) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Refresh token ausente' });
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) return res.status(401).json({ error: 'Refresh token inválido' });
  await prisma.refreshToken.update({ where: { token }, data: { revoked: true } });
  const payload = jwt.verify(token, JWT_REFRESH) as AuthPayload;
  const tokens = signToken({ id: payload.id, email: payload.email, role: payload.role });
  await prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId: payload.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  res.json(tokens);
}

async function logout(req: express.Request, res: express.Response) {
  const { token } = req.body;
  if (token) await prisma.refreshToken.update({ where: { token }, data: { revoked: true } }).catch(() => {});
  res.json({ ok: true });
}

async function getMe(req: express.Request, res: express.Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  res.json(user);
}

// ============ LEADS ============

async function listLeads(req: express.Request, res: express.Response) {
  const { page = '1', limit = '20', search, status, tag } = req.query;
  const where: any = {};
  if (req.user!.role !== 'ADMIN') where.createdById = req.user!.id;
  if (search) where.OR = [{ nome: { contains: String(search), mode: 'insensitive' } }, { telefone: { contains: String(search) } }, { email: { contains: String(search), mode: 'insensitive' } }];
  if (status) where.status = String(status).toUpperCase();
  if (tag) where.tags = { has: String(tag) };
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.lead.count({ where }),
  ]);
  res.json({ data: leads, total, page: Number(page), limit: Number(limit) });
}

async function createLead(req: express.Request, res: express.Response) {
  const { nome, email, telefone, cidade, estado, empresa, cargo, tags } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const lead = await prisma.lead.create({ data: { nome, email, telefone, cidade, estado, empresa, cargo, tags: tags || [], createdById: req.user!.id } });
  res.status(201).json(lead);
}

async function getLead(req: express.Request, res: express.Response) {
  const lead = await prisma.lead.findUnique({ where: { id: pid(req) } });
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json(lead);
}

async function updateLead(req: express.Request, res: express.Response) {
  const lead = await prisma.lead.update({ where: { id: pid(req) }, data: req.body });
  res.json(lead);
}

async function deleteLead(req: express.Request, res: express.Response) {
  await prisma.lead.delete({ where: { id: pid(req) } });
  res.json({ ok: true });
}

async function importCsv(req: express.Request, res: express.Response) {
  if (!req.file) return res.status(400).json({ error: 'Arquivo ausente' });
  const records = parseCsv(req.file.buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  let imported = 0;
  for (const row of records) {
    if (!row.nome && !row.name) continue;
    await prisma.lead.create({ data: { nome: row.nome || row.name || '', telefone: row.telefone || row.phone || null, email: row.email || null, cidade: row.cidade || row.city || null, empresa: row.empresa || row.company || null, createdById: req.user!.id, source: 'IMPORT' } }).then(() => imported++).catch(() => {});
  }
  res.json({ imported });
}

async function importXlsx(req: express.Request, res: express.Response) {
  if (!req.file) return res.status(400).json({ error: 'Arquivo ausente' });
  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
  let imported = 0;
  for (const row of rows) {
    if (!row.nome && !row.name) continue;
    await prisma.lead.create({ data: { nome: row.nome || row.name || '', telefone: row.telefone || row.phone || null, email: row.email || null, cidade: row.cidade || row.city || null, empresa: row.empresa || row.company || null, createdById: req.user!.id, source: 'IMPORT' } }).then(() => imported++).catch(() => {});
  }
  res.json({ imported });
}

async function removeDuplicates(req: express.Request, res: express.Response) {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'asc' } });
  const seen = new Set<string>();
  let removed = 0;
  for (const l of leads) {
    const key = l.telefone || l.email || l.nome;
    if (!key || seen.has(key)) { await prisma.lead.delete({ where: { id: l.id } }); removed++; }
    else seen.add(key);
  }
  res.json({ removed });
}

// ============ CAMPAIGNS ============

async function listCampaigns(req: express.Request, res: express.Response) {
  const where: any = {};
  if (req.user!.role !== 'ADMIN') where.createdById = req.user!.id;
  const campaigns = await prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { leads: true, dispatches: true } } } });
  res.json(campaigns);
}

async function createCampaign(req: express.Request, res: express.Response) {
  const { nome, descricao, mensagem, agendamento, speed } = req.body;
  if (!nome || !mensagem) return res.status(400).json({ error: 'Nome e mensagem obrigatórios' });
  const campaign = await prisma.campaign.create({ data: { nome, descricao, mensagem, agendamento: agendamento ? new Date(agendamento) : null, status: agendamento ? 'ACTIVE' : 'DRAFT', speed: Number(speed) || 5, createdById: req.user!.id } });
  res.status(201).json(campaign);
}

async function getCampaign(req: express.Request, res: express.Response) {
  const campaign = await prisma.campaign.findUnique({ where: { id: pid(req) }, include: { leads: true, dispatches: true } });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  res.json(campaign);
}

async function updateCampaign(req: express.Request, res: express.Response) {
  const campaign = await prisma.campaign.update({ where: { id: pid(req) }, data: req.body });
  res.json(campaign);
}

async function deleteCampaign(req: express.Request, res: express.Response) {
  await prisma.campaign.delete({ where: { id: pid(req) } });
  res.json({ ok: true });
}

async function changeCampaignStatus(req: express.Request, res: express.Response) {
  const { status } = req.body;
  if (!['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].includes(status)) return res.status(400).json({ error: 'Status inválido' });
  const campaign = await prisma.campaign.update({ where: { id: pid(req) }, data: { status } });
  res.json(campaign);
}

// ============ DISPATCHES ============

async function listDispatches(req: express.Request, res: express.Response) {
  const { campaignId, status, page = '1', limit = '20' } = req.query;
  const where: any = {};
  if (campaignId) where.campaignId = String(campaignId);
  if (status) where.status = String(status).toUpperCase();
  if (req.user!.role !== 'ADMIN') where.userId = req.user!.id;
  const [dispatches, total] = await Promise.all([
    prisma.dispatch.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' }, include: { lead: { select: { nome: true, telefone: true } }, campaign: { select: { nome: true } } } }),
    prisma.dispatch.count({ where }),
  ]);
  res.json({ data: dispatches, total, page: Number(page), limit: Number(limit) });
}

async function dispatchStats(req: express.Request, res: express.Response) {
  const where: any = {};
  if (req.user!.role !== 'ADMIN') where.userId = req.user!.id;
  const [pending, queued, sent, delivered, failed, cancelled] = await Promise.all([
    prisma.dispatch.count({ where: { ...where, status: 'PENDING' } }),
    prisma.dispatch.count({ where: { ...where, status: 'QUEUED' } }),
    prisma.dispatch.count({ where: { ...where, status: 'SENT' } }),
    prisma.dispatch.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.dispatch.count({ where: { ...where, status: 'FAILED' } }),
    prisma.dispatch.count({ where: { ...where, status: 'CANCELLED' } }),
  ]);
  res.json({ pending, queued, sent, delivered, failed, cancelled, total: pending + queued + sent + delivered + failed + cancelled });
}

async function startCampaignDispatch(req: express.Request, res: express.Response) {
  const campaign = await prisma.campaign.findUnique({ where: { id: pid(req) }, include: { leads: true, dispatches: true } });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.status !== 'ACTIVE') return res.status(400).json({ error: 'Campanha deve estar ativa' });
  if (campaign.leads.length === 0) return res.status(400).json({ error: 'Nenhum lead vinculado à campanha' });

  const leadsWithPhone = campaign.leads.filter((l) => l.telefone && l.telefone.trim() !== '');
  if (leadsWithPhone.length === 0) return res.status(400).json({ error: 'Nenhum lead com telefone válido' });

  let created = 0;
  let skippedDedup = 0;
  const costPerDispatch = campaign.costPerDispatch || 0.04;
  const totalEstimatedCost = leadsWithPhone.length * costPerDispatch;

  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { balance: true } });
  if ((user?.balance || 0) < totalEstimatedCost) {
    return res.status(402).json({ error: `Saldo insuficiente. Necess�rio: R$ ${totalEstimatedCost.toFixed(2)}, Saldo: R$ ${(user?.balance || 0).toFixed(2)}` });
  }

  await prisma.user.update({ where: { id: req.user!.id }, data: { balance: { decrement: totalEstimatedCost } } });
  await prisma.creditTransaction.create({
    data: {
      userId: req.user!.id,
      amount: -totalEstimatedCost,
      type: 'DISPATCH_CHARGE',
      paymentId: `dispatch_${campaign.id}_${Date.now()}`,
      metadata: { campaignId: campaign.id, count: leadsWithPhone.length, costPerDispatch },
    },
  });

  for (const lead of leadsWithPhone) {
    const phone = lead.telefone!.replace(/\D/g, '');
    const isDuplicate = await checkPhoneDedup(phone, campaign.id);
    if (isDuplicate) {
      skippedDedup++;
      continue;
    }
    const message = replaceVars(campaign.mensagem, { nome: lead.nome, cidade: lead.cidade || '', empresa: lead.empresa || '', produto: '' });
    const dispatch = await prisma.dispatch.create({ data: { campaignId: campaign.id, leadId: lead.id, userId: req.user!.id, mensagem: message, status: 'QUEUED', cost: costPerDispatch } });
    created++;
    if (dispatchQueue) {
      const delay = calculateDelay(campaign.speed || 5, created - 1);
      await dispatchQueue.add('dispatch', { dispatchId: dispatch.id, phone, message, campaignId: campaign.id, cost: costPerDispatch, userId: req.user!.id }, { jobId: dispatch.id, delay });
    } else {
      const result = await sendWhatsAppMessage(phone, message);
      if (result.ok) {
        await prisma.dispatch.update({ where: { id: dispatch.id }, data: { status: 'SENT', sentAt: new Date(), evolutionKey: result.key ? { id: result.key.id, remoteJid: result.key.remoteJid } : undefined } });
        await prisma.dispatch.update({ where: { id: dispatch.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
      } else {
        await prisma.dispatch.update({ where: { id: dispatch.id }, data: { status: 'FAILED', error: result.error } });
        await prisma.user.update({ where: { id: req.user!.id }, data: { balance: { increment: costPerDispatch } } });
        await prisma.creditTransaction.create({
          data: {
            userId: req.user!.id,
            amount: costPerDispatch,
            type: 'DISPATCH_REFUND',
            paymentId: `refund_${dispatch.id}`,
            metadata: { dispatchId: dispatch.id, reason: result.error || 'send_failed' },
          },
        });
      }
    }
  }

  res.json({
    created,
    skippedDedup,
    costPerDispatch,
    totalEstimatedCost,
    message: `${created} disparos enfileirados${skippedDedup > 0 ? `, ${skippedDedup} telefones duplicados ignorados` : ''}`,
  });
}

async function cancelCampaignDispatch(req: express.Request, res: express.Response) {
  const campaign = await prisma.campaign.findUnique({ where: { id: pid(req) }, include: { dispatches: true } });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.status === 'CANCELLED') return res.json({ ok: true, message: 'Campanha já cancelada' });

  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'CANCELLED' } });

  const pendingDispatches = campaign.dispatches.filter((d) => d.status === 'QUEUED' || d.status === 'PENDING');
  let cancelledCount = 0;
  let deletedCount = 0;
  let deleteFailed = 0;

  for (const dispatch of pendingDispatches) {
    await prisma.dispatch.update({ where: { id: dispatch.id }, data: { status: 'CANCELLED' } });
    cancelledCount++;
    if (dispatchQueue) {
      try {
        const job = await dispatchQueue.getJob(dispatch.id);
        if (job && !job.finishedOn) {
          await job.remove();
        }
      } catch {}
    }
  }

  const recentSent = campaign.dispatches.filter(
    (d) => (d.status === 'SENT' || d.status === 'DELIVERED') && d.sentAt && Date.now() - new Date(d.sentAt).getTime() < 3600000
  );

  for (const dispatch of recentSent) {
    if (dispatch.evolutionKey && typeof dispatch.evolutionKey === 'object') {
      const key = dispatch.evolutionKey as { id?: string; remoteJid?: string };
      if (key.id && key.remoteJid) {
        const deleted = await deleteWhatsAppMessage(key.remoteJid, key.id);
        if (deleted) {
          deletedCount++;
        } else {
          deleteFailed++;
        }
      }
    }
  }

  res.json({
    ok: true,
    message: `Campanha cancelada. ${cancelledCount} disparos cancelados, ${deletedCount} mensagens excluídas do WhatsApp`,
    cancelledCount,
    messagesDeleted: deletedCount,
    messagesDeletionFailed: deleteFailed,
  });
}

// ============ DASHBOARD ============

async function dashboardStats(req: express.Request, res: express.Response) {
  const userId = req.user!.id;
  const where = req.user!.role !== 'ADMIN' ? { createdById: userId } : {};
  const [totalLeads, totalDispatches, delivered, qualified] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.dispatch.count({ where: req.user!.role !== 'ADMIN' ? { userId } : {} }),
    prisma.dispatch.count({ where: { ...req.user!.role !== 'ADMIN' ? { userId } : {}, status: 'DELIVERED' } }),
    prisma.lead.count({ where: { ...where, status: 'QUALIFIED' } }),
  ]);
  const responseRate = totalDispatches > 0 ? ((delivered / totalDispatches) * 100).toFixed(1) : '0';
  res.json({ totalLeads, totalDispatches, responseRate: Number(responseRate), qualifiedLeads: qualified, costPerLead: totalLeads > 0 ? (18.7).toFixed(2) : '0' });
}

async function dashboardCharts(req: express.Request, res: express.Response) {
  // Dados mock para charts (dados reais viriam de agregações)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  });
  res.json({
    leadsPerDay: days.map((d, i) => ({ name: d, value: Math.floor(Math.random() * 50) + 20 })),
    messagesSent: days.map((d, i) => ({ name: d, value: Math.floor(Math.random() * 200) + 100, value2: Math.floor(Math.random() * 150) + 80 })),
    conversion: days.map((d) => ({ name: d, value: Math.floor(Math.random() * 30) + 25 })),
  });
}

async function dashboardTimeline(req: express.Request, res: express.Response) {
  const dispatches = await prisma.dispatch.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { lead: { select: { nome: true } }, campaign: { select: { nome: true } } } });
  const timeline = dispatches.map((d: any) => ({ id: d.id, message: `${d.lead.nome} - ${d.campaign.nome}: ${d.status}`, timestamp: d.createdAt }));
  res.json(timeline);
}

// ============ REPORTS ============

async function getReports(req: express.Request, res: express.Response) {
  const totalLeads = await prisma.lead.count();
  const totalDispatches = await prisma.dispatch.count();
  const delivered = await prisma.dispatch.count({ where: { status: 'DELIVERED' } });
  const qualified = await prisma.lead.count({ where: { status: 'QUALIFIED' } });
  const converted = await prisma.lead.count({ where: { status: 'CONVERTED' } });
  res.json({ totalLeads, totalDispatches, delivered, qualified, converted, conversionRate: totalDispatches > 0 ? ((delivered / totalDispatches) * 100).toFixed(1) : '0', roi: converted > 0 ? (totalDispatches / converted).toFixed(2) : '0' });
}

async function exportCsv(req: express.Request, res: express.Response) {
  const leads = await prisma.lead.findMany({ take: 10000 });
  const header = 'id,nome,email,telefone,cidade,empresa,status,tags,createdAt\n';
  const rows = leads.map((l: any) => `${l.id},${l.nome},${l.email || ''},${l.telefone || ''},${l.cidade || ''},${l.empresa || ''},${l.status},"${l.tags.join(';')}",${l.createdAt}`).join('\n');
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.send(header + rows);
}

async function exportXlsx(req: express.Request, res: express.Response) {
  const leads = await prisma.lead.findMany({ take: 10000 });
  const ws = XLSX.utils.json_to_sheet(leads.map((l: any) => ({ ID: l.id, Nome: l.nome, Email: l.email, Telefone: l.telefone, Cidade: l.cidade, Empresa: l.empresa, Status: l.status, Tags: l.tags.join(';'), Criado: l.createdAt })));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');
  res.send(buf);
}

// ============ PAYMENTS ==========

const PAYMENT_PLANS = [
  { id: 'starter', label: 'Starter', amount: 50, credits: 1000 },
  { id: 'growth', label: 'Growth', amount: 150, credits: 4000 },
  { id: 'business', label: 'Business', amount: 400, credits: 12000 },
  { id: 'enterprise', label: 'Enterprise', amount: 1000, credits: 35000 },
];

async function getPaymentPlans(req: express.Request, res: express.Response) {
  res.json(PAYMENT_PLANS);
}

async function getBalance(req: express.Request, res: express.Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, balance: true } });
  res.json({ balance: user?.balance || 0 });
}

function generatePaymentId() {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateMercadoPagoLink(amount: number, planId: string): { checkoutUrl: string; paymentId: string } {
  const paymentId = generatePaymentId();
  const baseUrl = process.env.MERCADO_PAGO_CHECKOUT_URL || 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=';
  const checkoutUrl = `${baseUrl}${encodeURIComponent(JSON.stringify({ external_reference: paymentId, transaction_amount: amount.toFixed(2), description: `NEXUS Recarga - ${planId}` }))}`;
  return { checkoutUrl, paymentId };
}

function generateStripeLink(amount: number, planId: string): { checkoutUrl: string; paymentId: string } {
  const paymentId = generatePaymentId();
  const baseUrl = process.env.STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/test_';
  const checkoutUrl = `${baseUrl}${encodeURIComponent(JSON.stringify({ client_reference_id: paymentId, amount: Math.round(amount * 100), currency: 'brl', metadata: { planId } }))}`;
  return { checkoutUrl, paymentId };
}

async function createMercadoPagoPixPayment(amount: number, planId: string, externalReference: string, payerEmail: string, payerName: string) {
  const url = 'https://api.mercadopago.com/v1/payments';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
  };
  const body = {
    transaction_amount: amount,
    description: `NEXUS Recarga - ${planId}`,
    payment_method_id: 'pix',
    // @ts-ignore
    external_reference,
    payer: {
      email: payerEmail,
      first_name: payerName.split(' ')[0],
      last_name: payerName.split(' ').slice(1).join(' '),
    },
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mercado Pago ${res.status}: ${err}`);
  }
  return await res.json();
}

async function createPayment(req: express.Request, res: express.Response) {
  const { planId } = req.body;
  const plan = PAYMENT_PLANS.find((p) => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Plano inv�lido' });

  const paymentId = generatePaymentId();
  const gateway = process.env.PAYMENT_GATEWAY || 'mock';

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true } });

    if (gateway === 'mercadopago') {
      const pixPayment = await createMercadoPagoPixPayment(plan.amount, plan.id, paymentId, user?.email || req.user!.email, user?.name || 'Cliente');

      const metadata: any = { planId, amount: plan.amount, gateway };
      if (pixPayment.point_of_interaction?.transaction_data) {
        metadata.mercadoPagoPaymentId = String(pixPayment.id);
        metadata.qrCode = pixPayment.point_of_interaction.transaction_data.qr_code;
        metadata.qrCodeBase64 = pixPayment.point_of_interaction.transaction_data.qr_code_base64;
      }

      const transaction = await prisma.creditTransaction.create({
        data: {
          userId: req.user!.id,
          amount: plan.credits,
          type: 'DEPOSIT',
          status: 'PENDING',
          paymentId,
          metadata,
        },
      });

      return res.status(201).json({
        paymentId,
        status: pixPayment.status,
        qrCode: pixPayment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: pixPayment.point_of_interaction?.transaction_data?.qr_code_base64,
        amount: plan.amount,
        credits: plan.credits,
      });
    }

    let checkoutUrl = '';
    if (gateway === 'stripe') {
      const result = generateStripeLink(plan.amount, plan.id);
      checkoutUrl = result.checkoutUrl;
    } else {
      checkoutUrl = `mock://payment/${paymentId}`;
    }

    const transaction = await prisma.creditTransaction.create({
      data: {
        userId: req.user!.id,
        amount: plan.credits,
        type: 'DEPOSIT',
        status: 'PENDING',
        paymentId,
        metadata: { planId, amount: plan.amount, gateway },
      },
    });

    res.status(201).json({ paymentId, checkoutUrl, amount: plan.amount, credits: plan.credits });
  } catch (e: any) {
    console.error('Erro ao criar pagamento:', e);
    res.status(500).json({ error: 'Erro ao criar pagamento: ' + e.message });
  }
};

async function getPaymentStatus(req: express.Request, res: express.Response) {
  const paymentId = String(req.params.paymentId);
  const transaction = await prisma.creditTransaction.findFirst({
    where: { paymentId, userId: req.user!.id, type: 'DEPOSIT' },
    select: { id: true, status: true, amount: true, metadata: true, createdAt: true },
  });
  if (!transaction) return res.status(404).json({ error: 'Transa��o n�o encontrada' });

  let mercadoPagoStatus: string | null = null;
  if (transaction.metadata && typeof transaction.metadata === 'object' && (transaction.metadata as any).mercadoPagoPaymentId) {
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${(transaction.metadata as any).mercadoPagoPaymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
      });
      if (res.ok) {
        const mpPayment = await res.json();
        mercadoPagoStatus = mpPayment.status || null;
      }
    } catch (e) {
      console.error('Erro ao consultar status no Mercado Pago:', e);
    }
  }

  res.json({ status: transaction.status, mercadoPagoStatus, amount: transaction.amount, createdAt: transaction.createdAt });
}

async function confirmPayment(req: express.Request, res: express.Response) {
  const { paymentId } = req.body;
  const transaction = await prisma.creditTransaction.findFirst({ where: { paymentId, userId: req.user!.id, type: 'DEPOSIT', status: 'PENDING' } });
  if (!transaction) return res.status(404).json({ error: 'Transa��o n�o encontrada' });

  if (transaction.status === 'APPROVED') return res.json({ ok: true, balance: (await prisma.user.findUnique({ where: { id: req.user!.id }, select: { balance: true } }))?.balance || 0 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user!.id }, data: { balance: { increment: transaction.amount } } }),
    prisma.creditTransaction.update({ where: { id: transaction.id }, data: { status: 'APPROVED' } }),
  ]);

  res.json({ ok: true, balance: (await prisma.user.findUnique({ where: { id: req.user!.id }, select: { balance: true } }))?.balance || 0 });
}

async function webhookMercadoPago(req: express.Request, res: express.Response) {
  const { type, data } = req.body;

  if (type === 'payment') {
    const paymentId = data.id;
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
      });
      if (!mpRes.ok) return res.status(200).json({ received: true });
      const mpPayment = await mpRes.json();

      if (mpPayment.status === 'approved') {
        const externalReference = mpPayment.external_reference;
        if (!externalReference) return res.status(200).json({ received: true });

        const transaction = await prisma.creditTransaction.findFirst({ where: { paymentId: externalReference, type: 'DEPOSIT', status: 'PENDING' } });
        if (transaction) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: transaction.userId }, data: { balance: { increment: transaction.amount } } }),
            prisma.creditTransaction.update({ where: { id: transaction.id }, data: { status: 'APPROVED', metadata: { ...(transaction.metadata as object), mercadoPagoPaymentId: String(paymentId) } } }),
          ]);
        }
      }
    } catch (e) {
      console.error('Erro no webhook Mercado Pago:', e);
    }
  }

  res.status(200).json({ received: true });
}
// ============ SETTINGS ============

async function getSettings(req: express.Request, res: express.Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true } });
  res.json(user);
}

async function updateSettings(req: express.Request, res: express.Response) {
  const { name, email } = req.body;
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { name, email } });
  res.json(user);
}

async function changePassword(req: express.Request, res: express.Response) {
  const { current, password } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(current, user.password))) return res.status(401).json({ error: 'Senha atual incorreta' });
  await prisma.user.update({ where: { id: req.user!.id }, data: { password: await bcrypt.hash(password, 12) } });
  res.json({ ok: true });
}

// ============ EVOLUTION API SETTINGS ============

function getEvolutionConfig(req: express.Request, res: express.Response) {
  const config = loadEvolutionConfig();
  res.json({
    apiUrl: config.apiUrl,
    instanceName: config.instanceName,
    configured: !!(config.apiKey && config.instanceName),
  });
}

async function updateEvolutionConfig(req: express.Request, res: express.Response) {
  const { apiUrl, apiKey, instanceName } = req.body;
  const current = loadEvolutionConfig();
  saveEvolutionConfig({
    apiUrl: apiUrl || current.apiUrl,
    apiKey: apiKey || current.apiKey,
    instanceName: instanceName || current.instanceName,
  });
  res.json({ ok: true });
}

async function testEvolutionConnection(req: express.Request, res: express.Response) {
  const config = loadEvolutionConfig();
  if (!config.apiKey || !config.instanceName) {
    return res.status(400).json({ ok: false, error: 'Configure API Key e nome da instância primeiro' });
  }
  try {
    const url = `${config.apiUrl}/instance/connectionState/${config.instanceName}`;
    const response = await fetch(url, { headers: { 'apikey': config.apiKey } });
    const data = await response.json();
    res.json({ ok: response.ok, data });
  } catch (e: any) {
    res.json({ ok: false, error: `Falha ao conectar: ${e.message}` });
  }
}

// ============ EXPRESS APP ============

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '15mb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Auth
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/refresh', refreshToken);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', authMiddleware, getMe);

// Leads
app.get('/api/leads', authMiddleware, listLeads);
app.post('/api/leads', authMiddleware, createLead);
app.get('/api/leads/:id', authMiddleware, getLead);
app.put('/api/leads/:id', authMiddleware, updateLead);
app.delete('/api/leads/:id', authMiddleware, deleteLead);
app.post('/api/leads/import/csv', authMiddleware, upload.single('file'), importCsv);
app.post('/api/leads/import/xlsx', authMiddleware, upload.single('file'), importXlsx);
app.delete('/api/leads/duplicates', authMiddleware, removeDuplicates);

// Campaigns
app.get('/api/campaigns', authMiddleware, listCampaigns);
app.post('/api/campaigns', authMiddleware, createCampaign);
app.get('/api/campaigns/:id', authMiddleware, getCampaign);
app.put('/api/campaigns/:id', authMiddleware, updateCampaign);
app.delete('/api/campaigns/:id', authMiddleware, deleteCampaign);
app.patch('/api/campaigns/:id/status', authMiddleware, changeCampaignStatus);
app.post('/api/campaigns/:id/dispatch', authMiddleware, startCampaignDispatch);
app.post('/api/campaigns/:id/dispatch/cancel', authMiddleware, cancelCampaignDispatch);

// Dispatches
app.get('/api/dispatches', authMiddleware, listDispatches);
app.get('/api/dispatches/stats', authMiddleware, dispatchStats);

// Payments
app.get('/api/payments/plans', authMiddleware, getPaymentPlans);
app.get('/api/payments/balance', authMiddleware, getBalance);
app.post('/api/payments/create', authMiddleware, createPayment);
app.post('/api/payments/confirm', authMiddleware, confirmPayment);
app.get('/api/payments/status/:paymentId', authMiddleware, getPaymentStatus);
app.post('/api/webhooks/mercadopago', express.raw({ type: 'application/json' }), webhookMercadoPago);

// Dashboard
app.get('/api/dashboard/stats', authMiddleware, dashboardStats);
app.get('/api/dashboard/charts', authMiddleware, dashboardCharts);
app.get('/api/dashboard/timeline', authMiddleware, dashboardTimeline);

// Reports
app.get('/api/reports', authMiddleware, getReports);
app.get('/api/reports/export/csv', authMiddleware, exportCsv);
app.get('/api/reports/export/xlsx', authMiddleware, exportXlsx);

// Settings
app.get('/api/settings', authMiddleware, getSettings);
app.put('/api/settings', authMiddleware, updateSettings);
app.put('/api/settings/password', authMiddleware, changePassword);

// Evolution API (WhatsApp)
app.get('/api/settings/whatsapp', authMiddleware, getEvolutionConfig);
app.put('/api/settings/whatsapp', authMiddleware, updateEvolutionConfig);
app.post('/api/settings/whatsapp/test', authMiddleware, testEvolutionConnection);

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Erro interno' });
});

app.listen(PORT, () => console.log(`NEXUS Lead System rodando na porta ${PORT}`));

export default app;

