import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Send, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import api from '../services/api';
import type { Campaign, Dispatch, CampaignStatus } from '../types';

function normalizeStatus(status: string): CampaignStatus {
  const s = status.toUpperCase();
  if (s === 'DRAFT' || s === 'RASCUNHO') return 'DRAFT';
  if (s === 'ACTIVE' || s === 'EXECUTANDO' || s === 'AGENDADA') return 'ACTIVE';
  if (s === 'PAUSED' || s === 'PAUSADA') return 'PAUSED';
  if (s === 'COMPLETED' || s === 'CONCLUIDA') return 'COMPLETED';
  if (s === 'CANCELLED' || s === 'CANCELADA') return 'CANCELLED';
  return s as CampaignStatus;
}

function isActive(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'ACTIVE' || s === 'EXECUTANDO' || s === 'AGENDADA';
}

function isPaused(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'PAUSED' || s === 'PAUSADA';
}

function isDraftOrScheduled(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'DRAFT' || s === 'RASCUNHO' || s === 'AGENDADA';
}

export function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const [campaignRes, dispatchesRes] = await Promise.all([
          api.get(`/campaigns/${id}`),
          api.get(`/dispatches?campaignId=${id}`),
        ]);
        setCampaign(campaignRes.data);
        setDispatches(dispatchesRes.data.data || []);
      } catch (e) {
        console.error('Erro ao carregar detalhe da campanha:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const previewMessage = campaign?.mensagem
    ?.replace('{nome}', 'João Silva')
    ?.replace('{cidade}', 'São Paulo')
    ?.replace('{empresa}', 'TechCorp')
    ?.replace('{produto}', 'Produto') || '';

  const handleStatus = async (action: string) => {
    if (!campaign) return;
    try {
      if (action === 'cancel') {
        const res = await api.post(`/campaigns/${campaign.id}/dispatch/cancel`);
        alert(res.data.message || 'Campanha cancelada');
        setCampaign((c) => c ? { ...c, status: 'CANCELLED' } : null);
        return;
      }
      const statusMap: Record<string, CampaignStatus> = { start: 'ACTIVE', pause: 'PAUSED', resume: 'ACTIVE' };
      const newStatus = statusMap[action];
      if (newStatus) {
        await api.patch(`/campaigns/${campaign.id}/status`, { status: newStatus });
        setCampaign((c) => c ? { ...c, status: newStatus } : null);
      }
      if (action === 'start' || action === 'resume') {
        if (!window.confirm(`Deseja iniciar o disparo? Custo estimado: R$ ${(totalLeads * (campaign.costPerDispatch || 0.04)).toFixed(2)}`)) {
          await api.patch(`/campaigns/${campaign.id}/status`, { status: 'PAUSED' });
          setCampaign((c) => c ? { ...c, status: 'PAUSED' } : null);
          return;
        }
        const res = await api.post(`/campaigns/${campaign.id}/dispatch`);
        alert(res.data.message || `${res.data.created} disparos criados`);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const dispatchColumns: Column<Dispatch>[] = [
    { key: 'lead?.nome', header: 'Lead' },
    { key: 'status', header: 'Status', render: (d) => <Badge variant={statusVariant(d.status.toLowerCase())}>{statusLabel(d.status.toLowerCase())}</Badge> },
    { key: 'sentAt', header: 'Enviado em', render: (d) => <span className="text-xs text-[var(--text-secondary)]">{d.sentAt ? new Date(d.sentAt).toLocaleString('pt-BR') : '-'}</span> },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse h-64"><div /></Card>
        <Card className="animate-pulse h-64"><div /></Card>
        <Card className="animate-pulse h-64"><div /></Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Card className="text-center py-12"><div>
          <p className="text-[var(--text-secondary)]">Campanha não encontrada</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate('/campanhas')}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div></Card>
      </div>
    );
  }

  const normalizedStatus = normalizeStatus(campaign.status);
  const totalLeads = campaign._count?.leads || campaign.totalLeads || 0;
  const dispatched = campaign._count?.dispatches || campaign.dispatched || 0;
  const progress = totalLeads ? Math.round((dispatched / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/campanhas')} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <Card><div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{campaign.nome}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{campaign.descricao}</p>
          </div>
          <Badge variant={statusVariant(normalizedStatus.toLowerCase())}>{statusLabel(normalizedStatus.toLowerCase())}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-[var(--hover)]/30">
            <p className="text-xl font-bold text-[var(--text-primary)]">{totalLeads}</p>
            <p className="text-xs text-[var(--text-secondary)]">Total de Leads</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[var(--hover)]/30">
            <p className="text-xl font-bold text-[#60A5FA]">{dispatched}</p>
            <p className="text-xs text-[var(--text-secondary)]">Enviados</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[var(--hover)]/30">
            <p className="text-xl font-bold text-[var(--text-primary)]">R$ {(dispatched * (campaign.costPerDispatch || 0.04)).toFixed(2)}</p>
            <p className="text-xs text-[var(--text-secondary)]">Custo Total</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-[var(--text-secondary)]">
          <span>Provedor: {campaign.provider === 'OFFICIAL' ? 'API Oficial' : 'Evolution API'}</span>
          <span>Custo/envio: R$ {(campaign.costPerDispatch || 0.04).toFixed(2)}</span>
          <span>Velocidade: {campaign.speed || 5}/min</span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[var(--hover)]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex gap-2">
          {isDraftOrScheduled(campaign.status) && (
            <Button size="sm" onClick={() => handleStatus('start')}><Play className="w-4 h-4" /> Iniciar</Button>
          )}
          {isActive(campaign.status) && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleStatus('pause')}><Pause className="w-4 h-4" /> Pausar</Button>
              <Button variant="ghost" size="sm" onClick={() => handleStatus('cancel')} className="!text-red-400 hover:!bg-red-500/10"><XCircle className="w-4 h-4" /> Cancelar</Button>
            </>
          )}
          {isPaused(campaign.status) && (
            <Button size="sm" onClick={() => handleStatus('resume')}><Play className="w-4 h-4" /> Continuar</Button>
          )}
        </div>
      </div></Card>

      <Card><div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Preview da Mensagem</h3>
        <div className="rounded-xl bg-[var(--hover)]/30 p-4">
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{previewMessage}</p>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-2">Variáveis substituídas com dados de exemplo</p>
      </div></Card>

      <Card><div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Disparos</h3>
        <Table columns={dispatchColumns} data={dispatches} getKey={(d) => d.id} pageSize={10} />
      </div>      </Card>
    </div>
  );
}