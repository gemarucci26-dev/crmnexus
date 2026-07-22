[![GitHub Issues](https://img.shields.io/github/issues/gemarucci26-dev/crmnexus)](https://github.com/gemarucci26-dev/crmnexus)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/gemarucci26-dev/crmnexus)](https://github.com/gemarucci26-dev/crmnexus/pulls)
[![GitHub License](https://img.shields.io/github/license/gemarucci26-dev/crmnexus)](https://github.com/gemarucci26-dev/crmnexus/blob/main/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/gemarucci26-dev/crmnexus)](https://github.com/gemarucci26-dev/crmnexus/commits/main)

# CRM Exora

> ⚠️ **Status: Em desenvolvimento**

## Objetivo

O **CRM Exora** é um sistema de gestão de relacionamento com clientes focado em operações de vendas e marketing via WhatsApp. Seu objetivo é centralizar o funil de leads, automatizar campanhas de disparo de mensagens em massa — com filas de processamento, delays, controle de status e métricas de entrega — e fornecer painéis de métricas e relatórios em tempo real. A plataforma busca reduzir a dependência de ferramentas externas e aumentar a eficiência da equipe comercial, oferecendo uma base unificada para cadastro, segmentação, automação e análise de resultados.

## Funcionalidades

- **Gestão de Leads** — Cadastro, importação (CSV/Excel), tags, status e histórico
- **Campanhas** — Criação, agendamento e acompanhamento de campanhas
- **Disparos** — Envio de mensagens em massa com fila de processamento
- **Dashboard** — Métricas, gráficos e KPIs em tempo real
- **Relatórios** — Análise de desempenho e conversões
- **Autenticação** — Login, registro e controle de acesso por roles (Admin, Manager, Operator)

## Ferramentas e Stack

### Backend

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Banco:** PostgreSQL 16 + Prisma ORM
- **Cache/Fila:** Redis 7 + BullMQ
- **Auth:** JWT (access + refresh tokens) + bcryptjs
- **Validação:** Zod
- **Segurança:** Helmet, CORS
- **Arquivos:** Multer, csv-parse, xlsx
- **Integrações:** Mercado Pago SDK
- **Observabilidade:** morgan, dotenv

### Frontend

- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Estilos:** Tailwind CSS + PostCSS + Autoprefixer
- **Roteamento:** React Router DOM v6
- **Estado:** React Context API
- **HTTP Client:** Axios
- **Ícones:** Lucide React
- **Datas:** date-fns
- **Utilitários CSS:** clsx + tailwind-merge

### Infraestrutura

- **Containerização:** Docker + Docker Compose
- **Proxy:** Nginx
- **Banco:** PostgreSQL 16 Alpine
- **Cache:** Redis 7 Alpine

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) + Docker Compose
- [pnpm](https://pnpm.io/) (opcional)

## Instalação

### Com Docker (recomendado)

```bash
git clone https://github.com/gemarucci26-dev/crmnexus.git
cd crmnexus
docker-compose up -d
```

O sistema ficará disponível em:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### Desenvolvimento local

**Backend:**

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Estrutura do Projeto

```
nexus-crm/
├── backend/
│   ├── src/
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Status do Projeto

O **CRM Exora** está em fase ativa de desenvolvimento. Funcionalidades, bibliotecas e arquitetura estão sujeitas a alterações até a primeira versão estável.

## Licença

Todos os direitos reservados. Este projeto é de uso privado e não pode ser reproduzido, distribuído ou modificado sem autorização do autor.
