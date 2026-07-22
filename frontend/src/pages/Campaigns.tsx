import { useState, useEffect } from 'react';
import { Plus, Play, Pause, X, Megaphone, Trash2, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Campaign, CampaignStatus, Provider } from '../types';

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

function isCompletedOrCancelled(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'COMPLETED' || s === 'CONCLUIDA' || s === 'CANCELLED' || s === 'CANCELADA';
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ nome: '', descricao: '', mensagem: '', speed: 5, provider: 'EVOLUTION' as Provider });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await api.get('/campaigns');
        setCampaigns(res.data);
      } catch (e) {
        console.error('Erro ao carregar campanhas:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleStatusChange = async (id: string, action: string) => {
    try {
      setActionLoading(id);
      if (action === 'cancel') {
        const res = await api.post(`/campaigns/${id}/dispatch/cancel`);
        alert(res.data.message || 'Campanha cancelada com sucesso');
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'CANCELLED' } : c));
        return;
      }
      const statusMap: Record<string, CampaignStatus> = { start: 'ACTIVE', pause: 'PAUSED', resume: 'ACTIVE' };
      const newStatus = statusMap[action];
      if (newStatus) {
        await api.patch(`/campaigns/${id}/status`, { status: newStatus });
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
      }
      if (action === 'start' || action === 'resume') {
        const res = await api.post(`/campaigns/${id}/dispatch`);
        alert(res.data.message || `${res.data.created} disparos criados`);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao alterar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir a campanha "${nome}"?`)) return;
    try {
      await api.delete(`/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao excluir campanha');
    }
  };

  const handleDuplicate = async (c: Campaign) => {
    try {
      const res = await api.post('/campaigns', {
        nome: `(Cópia) ${c.nome}`,
        descricao: c.descricao || '',
        mensagem: c.mensagem,
      });
      setCampaigns((prev) => [res.data, ...prev]);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao duplicar campanha');
    }
  };

  const [createError, setCreateError] = useState('');

  const handleCreate = async () => {
    setCreateError('');
    if (!newCampaign.nome.trim() || !newCampaign.mensagem.trim()) {
      setCreateError('Nome e mensagem são obrigatórios');
      return;
    }
    try {
      const costPerDispatch = newCampaign.provider === 'OFFICIAL' ? 0.06 : 0.04;
      const res = await api.post('/campaigns', {
        nome: newCampaign.nome.trim(),
        descricao: newCampaign.descricao.trim(),
        mensagem: newCampaign.mensagem.trim(),
        speed: newCampaign.speed,
        provider: newCampaign.provider,
        costPerDispatch,
      });
      setCampaigns((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setNewCampaign({ nome: '', descricao: '', mensagem: '', speed: 5, provider: 'EVOLUTION' });
    } catch (e: any) {
      setCreateError(e.response?.data?.error || 'Erro ao criar campanha');
    }
  };

  const actionButtons = (c: Campaign) => {
    const buttons: JSX.Element[] = [];
    if (isDraftOrScheduled(c.status)) {
      buttons.push(<Button key="start" variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'start')} disabled={actionLoading === c.id}><Play className="w-4 h-4" /></Button>);
    }
    if (isActive(c.status)) {
      buttons.push(<Button key="pause" variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'pause')} disabled={actionLoading === c.id}><Pause className="w-4 h-4" /></Button>);
    }
    if (isPaused(c.status)) {
      buttons.push(<Button key="resume" variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'resume')} disabled={actionLoading === c.id}><Play className="w-4 h-4" /></Button>);
    }
    if (!isCompletedOrCancelled(c.status)) {
      buttons.push(<Button key="cancel" variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'cancel')} disabled={actionLoading === c.id}><X className="w-4 h-4" /></Button>);
    }
    buttons.push(<Button key="copy" variant="ghost" size="sm" onClick={() => handleDuplicate(c)}><Copy className="w-4 h-4" /></Button>);
    buttons.push(<Button key="delete" variant="ghost" size="sm" onClick={() => handleDelete(c.id, c.nome)} className="hover:!text-red-400 hover:!bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>);
    return buttons;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse h-48"><div /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Campanhas</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((c) => {
          const totalLeads = c._count?.leads || c.totalLeads || 0;
          const dispatched = c._count?.dispatches || c.dispatched || 0;
          const progress = totalLeads ? Math.round((dispatched / totalLeads) * 100) : 0;
          const normStatus = normalizeStatus(c.status);
          return (
            <Card key={c.id} className="cursor-pointer hover:border-[#2563EB]/30 transition-colors" onClick={() => navigate(`/campanhas/${c.id}`)}><div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB]/10">
                    <Megaphone className="w-4 h-4 text-[#60A5FA]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{c.nome}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{c.descricao}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(normStatus.toLowerCase())}>{statusLabel(normStatus.toLowerCase())}</Badge>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                  <span>{dispatched}/{totalLeads} enviados</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--hover)]">
                  <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  {c.provider === 'OFFICIAL' ? 'Oficial' : 'Evolution'} · R$ {c.costPerDispatch.toFixed(2)}/envio
                </span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {actionButtons(c)}
                </div>
              </div>
            </div></Card>
          );
        })}
        {campaigns.length === 0 && (
          <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
            Nenhuma campanha criada. Clique em "Nova Campanha" para começar.
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nova Campanha">
        <div className="space-y-4">
          {createError && (
            <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-2.5 text-sm text-red-100">
              {createError}
            </div>
          )}
          <Input label="Nome" value={newCampaign.nome} onChange={(e) => setNewCampaign({ ...newCampaign, nome: e.target.value })} placeholder="Ex: Black Friday 2026" />
          <Input label="Descrição" value={newCampaign.descricao} onChange={(e) => setNewCampaign({ ...newCampaign, descricao: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Mensagem</label>
            <textarea
              value={newCampaign.mensagem}
              onChange={(e) => setNewCampaign({ ...newCampaign, mensagem: e.target.value })}
              placeholder="Olá {nome}! Temos uma novidade para você em {cidade}."
              className="w-full rounded-xl border bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 min-h-[100px]"
              style={{ borderColor: 'var(--border)' }}
            />
            <p className="text-xs text-[var(--text-secondary)]">Variáveis: {'{nome}'}, {'{cidade}'}, {'{empresa}'}, {'{produto}'}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Velocidade (envios/min)</label>
            <input
              type="range" min={1} max={60} value={newCampaign.speed}
              onChange={(e) => setNewCampaign({ ...newCampaign, speed: Number(e.target.value) })}
              className="w-full accent-[#2563EB]"
            />
            <span className="text-xs text-[var(--text-secondary)]">{newCampaign.speed} envios/min</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Provedor</label>
            <select
              value={newCampaign.provider}
              onChange={(e) => setNewCampaign({ ...newCampaign, provider: e.target.value as Provider })}
              className="w-full rounded-xl border bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="EVOLUTION">Evolution API (R$ 0,04/envio)</option>
              <option value="OFFICIAL">API Oficial WhatsApp (R$ 0,01/envio)</option>
            </select>
            <p className="text-xs text-[var(--text-secondary)]">
              {newCampaign.provider === 'EVOLUTION'
                ? 'Risco de banimento. Mais barato.'
                : 'Sem risco de banimento. Custo 25% do oficial.'}
            </p>
          </div>
          <Button className="w-full" onClick={handleCreate}>Criar Campanha</Button>
        </div>
      </Modal>
    </div>
  );
}