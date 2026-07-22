import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Reports() {
  const [period, setPeriod] = useState('6m');
  const [conversionData, setConversionData] = useState<Array<{ name: string; value: number }>>([]);
  const [leadsOverTime, setLeadsOverTime] = useState<Array<{ name: string; value: number }>>([]);
  const [costData, setCostData] = useState<Array<{ name: string; value: number; value2: number }>>([]);
  const [roiData, setRoiData] = useState<Array<{ name: string; value: number }>>([]);
  const [comparisonData, setComparisonData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await api.get('/reports');
        const data = res.data;

        setConversionData(data.conversionOverTime || []);
        setLeadsOverTime(data.leadsOverTime || []);
        setCostData(data.costOverTime || []);
        setRoiData(data.roiOverTime || []);
        setComparisonData([
          { name: 'Campanhas', value: data.totalCampaigns || 0 },
          { name: 'Leads', value: data.totalLeads || 0 },
          { name: 'Respostas', value: data.totalResponses || 0 },
          { name: 'Qualificados', value: data.qualifiedLeads || 0 },
          { name: 'Convertidos', value: data.convertedLeads || 0 },
        ]);
      } catch (e) {
        console.error('Erro ao carregar relatórios:', e);
        // Fallback: dados vazios
        setConversionData([]);
        setLeadsOverTime([]);
        setCostData([]);
        setRoiData([]);
        setComparisonData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [period]);

  const kpis = loading ? [
    { label: 'Taxa de Conversão', value: '---', sub: '---' },
    { label: 'CPL Médio', value: '---', sub: '---' },
    { label: 'ROI', value: '---', sub: '---' },
    { label: 'Leads Respondidos', value: '---', sub: '---' },
  ] : [
    { label: 'Taxa de Conversão', value: conversionData.length ? `${conversionData[conversionData.length - 1].value}%` : '0%', sub: '+5% vs mês anterior' },
    { label: 'CPL Médio', value: costData.length ? `R$ ${costData[costData.length - 1].value.toFixed(2)}` : 'R$ 0,00', sub: '-7% vs mês anterior' },
    { label: 'ROI', value: roiData.length ? `${roiData[roiData.length - 1].value.toFixed(1)}x` : '0x', sub: '+12% vs mês anterior' },
    { label: 'Leads Respondidos', value: comparisonData.find(d => d.name === 'Respostas')?.value?.toString() || '0', sub: '+8% vs mês anterior' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Relatórios</h2>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="1m">Último mês</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último ano</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/reports/export/csv', '_blank')}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/reports/export/xlsx', '_blank')}>
            <Download className="w-4 h-4" /> XLSX
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs text-[var(--text-secondary)]">{kpi.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpi.value}</p>
            <p className="text-xs text-emerald-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Taxa de Conversão</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={conversionData}>
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name="Conversão %" stroke="#2563EB" fill="url(#rGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Leads ao Longo do Tempo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={leadsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Leads" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Custo por Lead</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" name="CPL" stroke="#2563EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="value2" name="CPL Qualificado" stroke="#60A5FA" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">ROI por Mês</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={roiData}>
              <defs>
                <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name="ROI" stroke="#3B82F6" fill="url(#roiGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </motion.div>
  );
}