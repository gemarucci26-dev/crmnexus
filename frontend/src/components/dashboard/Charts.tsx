import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

interface ChartProps {
  data: { name: string; value: number; value2?: number }[];
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ConversionChart({ data }: ChartProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Taxa de Conversão</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" name="Conversões" stroke="#2563EB" fill="url(#convGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LeadsPerDayChart({ data }: ChartProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Leads por Dia</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Leads" fill="#3B82F6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function MessagesSentChart({ data }: ChartProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Mensagens Enviadas</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="value" name="Enviadas" stroke="#2563EB" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="value2" name="Entregues" stroke="#60A5FA" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function CampaignPerformanceChart({ data }: ChartProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Performance das Campanhas</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={100} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Envios" fill="#2563EB" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
