import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@nexus.com' },
    update: {},
    create: {
      email: 'demo@nexus.com',
      name: 'Demo User',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Demo user created:', user.email);

  // Sample leads
  const leadsData = [
    { nome: 'João Silva', telefone: '11999990001', cidade: 'São Paulo', empresa: 'TechCorp', tags: ['tech', 'sp'] },
    { nome: 'Maria Santos', telefone: '21999990002', cidade: 'Rio de Janeiro', empresa: 'DataPlus', tags: ['data', 'rj'] },
    { nome: 'Carlos Oliveira', telefone: '31999990003', cidade: 'Belo Horizonte', empresa: 'WebSolutions', tags: ['web', 'mg'] },
    { nome: 'Ana Costa', telefone: '41999990004', cidade: 'Curitiba', empresa: 'CloudNet', tags: ['cloud', 'pr'] },
    { nome: 'Pedro Souza', telefone: '51999990005', cidade: 'Porto Alegre', empresa: 'AppFactory', tags: ['apps', 'rs'] },
    { nome: 'Fernanda Lima', telefone: '61999990006', cidade: 'Brasília', empresa: 'InfoTech', tags: ['data', 'df'] },
    { nome: 'Lucas Pereira', telefone: '71999990007', cidade: 'Salvador', empresa: 'DigitalHub', tags: ['digital', 'ba'] },
    { nome: 'Juliana Alves', telefone: '81999990008', cidade: 'Recife', empresa: 'NetServices', tags: ['net', 'pe'] },
    { nome: 'Rafael Mendes', telefone: '85999990009', cidade: 'Fortaleza', empresa: 'SoftHouse', tags: ['soft', 'ce'] },
    { nome: 'Beatriz Rocha', telefone: '92999990010', cidade: 'Manaus', empresa: 'DevLab', tags: ['dev', 'am'] },
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({
      data: { ...lead, createdById: user.id },
    });
  }

  console.log(`${leadsData.length} leads created`);

  // Sample campaigns
  const campaign = await prisma.campaign.create({
    data: {
      nome: 'Black Friday 2026',
      descricao: 'Campanha de Black Friday para leads qualificados',
      mensagem: 'Olá {nome}! A {empresa} tem uma oferta especial de Black Friday para você em {cidade}. Aproveite!',
      status: 'DRAFT',
      createdById: user.id,
    },
  });

  console.log('Sample campaign created:', campaign.nome);

  console.log('\nSeed completed!');
  console.log('Login: demo@nexus.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());