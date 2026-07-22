import { useState, useEffect } from 'react';
import { Send, Filter } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import api from '../services/api';
import type { Dispatch } from '../types';

export function Dispatches() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDispatches() {
      try {
        const res = await api.get('/dispatches');
        setDispatches(res.data.data || []);
      } catch (e) {
        console.error('Erro ao carregar disparos:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchDispatches();
  }, []);

  const filtered = dispatches.filter((d) => {
    const matchCampaign = !campaignFilter || (d.campaign?.nome === campaignFilter);
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchCampaign && matchStatus;
  });

  const columns: Column<Dispatch>[] = [
    { key: 'lead?.nome', header: 'Lead' },
    { key: 'campaign?.nome', header: 'Campanha' },
    { key: 'status', header: 'Status', render: (d) => <Badge variant={statusVariant(d.status.toLowerCase())}>{statusLabel(d.status.toLowerCase())}</Badge> },
    { key: 'sentAt', header: 'Data', render: (d) => <span className="text-xs text-[var(--text-secondary)]">{d.sentAt ? new Date(d.sentAt).toLocaleString('pt-BR') : '-'}</span> },
  ];

  const campaigns = [...new Set(dispatches.map((d) => d.campaign?.nome).filter(Boolean))];

  const stats = {
    total: dispatches.length,
    pending: dispatches.filter((d) => d.status === 'PENDING').length,
    queued: dispatches.filter((d) => d.status === 'QUEUED').length,
    sent: dispatches.filter((d) => d.status === 'SENT').length,
    delivered: dispatches.filter((d) => d.status === 'DELIVERED').length,
    failed: dispatches.filter((d) => d.status === 'FAILED').length,
    cancelled: dispatches.filter((d) => d.status === 'CANCELLED').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse">
              <div className="h-8 w-16 bg-[var(--hover)] rounded" />
              <div className="h-4 w-24 bg-[var(--hover)] rounded mt-2" />
            </div>
          ))}
        </div>
        <Card className="animate-pulse h-64"><div /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-[var(--text-primary)]' },
          { label: 'Pendentes', value: stats.pending + stats.queued, color: 'text-amber-400' },
          { label: 'Enviados', value: stats.sent, color: 'text-[#60A5FA]' },
          { label: 'Entregues', value: stats.delivered, color: 'text-emerald-400' },
          { label: 'Falhas', value: stats.failed, color: 'text-red-400' },
          { label: 'Cancelados', value: stats.cancelled, color: 'text-gray-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="rounded-xl border bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="">Todas as campanhas</option>
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="QUEUED">Na fila</option>
          <option value="SENT">Enviado</option>
          <option value="DELIVERED">Entregue</option>
          <option value="CANCELLED">Cancelado</option>
          <option value="FAILED">Falhou</option>
        </select>
      </div>

      <Card><div>
        <Table columns={columns} data={filtered} getKey={(d) => d.id} pageSize={10} />
      </div>      </Card>
    </div>
  );
}