import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const config = (() => {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'evolution-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || '',
  };
})();

async function sendWhatsAppMessage(phone: string, text: string): Promise<{ ok: boolean; key?: { id: string; remoteJid: string }; error?: string }> {
  if (!config.apiKey || !config.instanceName) {
    return { ok: false, error: 'Evolution API não configurada' };
  }
  try {
    const url = `${config.apiUrl}/message/sendText/${config.instanceName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
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
    return { ok: false, error: `Falha ao enviar: ${e.message}` };
  }
}

const worker = new Worker(
  'dispatches',
  async (job) => {
    const { dispatchId, phone, message, campaignId, cost, userId } = job.data;
    console.log(`Processando disparo ${dispatchId}`);

    const dispatch = await prisma.dispatch.findUnique({ where: { id: dispatchId } });
    if (!dispatch) return;

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE') {
      await prisma.dispatch.update({ where: { id: dispatchId }, data: { status: 'CANCELLED', error: 'Campanha cancelada' } }).catch(() => {});
      if (cost && userId) {
        await prisma.user.update({ where: { id: userId }, data: { balance: { increment: cost } } }).catch(() => {});
        await prisma.creditTransaction.create({
          data: { userId, amount: cost, type: 'DISPATCH_REFUND', paymentId: `refund_${dispatchId}`, metadata: { dispatchId, reason: 'campaign_cancelled' } },
        }).catch(() => {});
      }
      return;
    }

    await prisma.dispatch.update({ where: { id: dispatchId }, data: { status: 'SENT', sentAt: new Date() } }).catch(console.error);

    const result = await sendWhatsAppMessage(phone, message);

    if (result.ok) {
      await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          evolutionKey: result.key ? { id: result.key.id, remoteJid: result.key.remoteJid } : undefined,
        },
      }).catch(console.error);
    } else {
      await prisma.dispatch.update({ where: { id: dispatchId }, data: { status: 'FAILED', error: result.error } }).catch(console.error);
      if (cost && userId) {
        await prisma.user.update({ where: { id: userId }, data: { balance: { increment: cost } } }).catch(() => {});
        await prisma.creditTransaction.create({
          data: { userId, amount: cost, type: 'DISPATCH_REFUND', paymentId: `refund_${dispatchId}`, metadata: { dispatchId, reason: result.error || 'send_failed' } },
        }).catch(() => {});
      }
    }

    console.log(`Disparo ${dispatchId} ${result.ok ? 'entregue' : 'falhou'}`);
  },
  {
    connection: redisUrl as any,
    concurrency: 5,
  }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} falhou:`, err.message);
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completado`);
});

console.log('Dispatch worker iniciado');
