import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageSquare, TrendingUp, Users, DollarSign } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ConversionChart, LeadsPerDayChart, MessagesSentChart, CampaignPerformanceChart } from '../components/dashboard/Charts';
import { Card } from '../components/ui/Card';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import type { DashboardStats, ChartData, Campaign } from '../types';

function normalizeStatus(status: string): Campaign['status'] {
  const s = status.toUpperCase();
  if (s === 'DRAFT' || s === 'RASCUNHO') return 'DRAFT';
  if (s === 'ACTIVE' || s === 'EXECUTANDO' || s === 'AGENDADA') return 'ACTIVE';
  if (s === 'PAUSED' || s === 'PAUSADA') return 'PAUSED';
  if (s === 'COMPLETED' || s === 'CONCLUIDA') return 'COMPLETED';
  if (s === 'CANCELLED' || s === 'CANCELADA') return 'CANCELLED';
  return s as Campaign['status'];
}

function isActiveStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'ACTIVE' || s === 'EXECUTANDO' || s === 'AGENDADA';
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [conversion, setConversion] = useState<ChartData[]>([]);
  const [leadsDay, setLeadsDay] = useState<ChartData[]>([]);
  const [messages, setMessages] = useState<ChartData[]>([]);
  const [campaignPerf, setCampaignPerf] = useState<ChartData[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; type: string; message: string; time: string; timestamp?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    async function fetchData() {
      try {
        const [statsRes, chartsRes, campaignsRes, timelineRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
          api.get('/campaigns'),
          api.get('/dashboard/timeline'),
        ]);
        setStats(statsRes.data);
        setConversion(chartsRes.data.conversion || []);
        setLeadsDay(chartsRes.data.leadsPerDay || []);
        setMessages(chartsRes.data.messagesSent || []);
        setCampaignPerf([]);
        setCampaigns(campaignsRes.data);
        setActivity(timelineRes.data || []);
      } catch (e) {
        console.error('Erro ao carregar dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 animate-pulse">
              <div className="h-4 w-24 bg-[var(--hover)] rounded mb-2" />
              <div className="h-8 w-16 bg-[var(--hover)] rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse"><div /></Card>
          ))}
        </div>
      </motion.div>
    );
  }

  const activeCampaigns = campaigns.filter(c => isActiveStatus(c.status));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Send} title="Leads Disparados" value={stats?.totalDispatches || 0} />
        <StatsCard icon={MessageSquare} title="Total Leads" value={stats?.totalLeads || 0} />
        <StatsCard icon={TrendingUp} title="Taxa de Resposta" value={`${Number(stats?.responseRate || 0).toFixed(1)}%`} />
        <StatsCard icon={Users} title="Leads Qualificados" value={stats?.qualifiedLeads || 0} />
        <StatsCard icon={DollarSign} title="Custo por Lead" value={`R$ ${Number(stats?.costPerLead || 0).toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConversionChart data={conversion} />
        <LeadsPerDayChart data={leadsDay} />
        <MessagesSentChart data={messages} />
        <CampaignPerformanceChart data={campaignPerf} />
      </div>

      <Card><div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Campanhas Ativas</h3>
        <div className="space-y-3">
          {activeCampaigns.map((c) => {
            const totalLeads = c._count?.leads || c.totalLeads || 0;
            const dispatched = c._count?.dispatches || c.dispatched || 0;
            const progress = totalLeads ? Math.round((dispatched / totalLeads) * 100) : 0;
            const normStatus = normalizeStatus(c.status);
            return (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--hover)]/30">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{c.nome}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{dispatched}/{totalLeads} enviados</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(normStatus.toLowerCase())}>{statusLabel(normStatus.toLowerCase())}</Badge>
                  <div className="w-24 h-2 rounded-full bg-[var(--hover)]">
                    <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
          {activeCampaigns.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">Nenhuma campanha ativa</p>
          )}
        </div>
      </div></Card>

      <Card><div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Atividade Recente</h3>
        <div className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-2 shrink-0" />
              <div>
                <p className="text-sm text-[var(--text-primary)]">{item.message}</p>
                <p className="text-xs text-[var(--text-secondary)]">{item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : item.time}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">Nenhuma atividade recente</p>
          )}
        </div>
      </div></Card>
    </motion.div>
  );
}