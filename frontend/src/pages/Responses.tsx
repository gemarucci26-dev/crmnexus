import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import api from '../services/api';
import type { Dispatch } from '../types';

export function Responses() {
  const [responses, setResponses] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResponses() {
      try {
        const res = await api.get('/dispatches');
        const allDispatches = res.data.data || [];
        setResponses(allDispatches.filter((d: Dispatch) => d.status === 'DELIVERED'));
      } catch (e) {
        console.error('Erro ao carregar respostas:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchResponses();
  }, []);

  const columns: Column<Dispatch>[] = [
    { key: 'lead?.nome', header: 'Lead' },
    { key: 'campaign?.nome', header: 'Campanha' },
    { key: 'mensagem', header: 'Mensagem', render: (d) => <span className="text-xs text-[var(--text-secondary)] truncate max-w-[200px] block">{d.mensagem}</span> },
    { key: 'status', header: 'Status', render: (d) => <Badge variant={statusVariant(d.status.toLowerCase())}>{statusLabel(d.status.toLowerCase())}</Badge> },
    { key: 'sentAt', header: 'Data', render: (d) => <span className="text-xs text-[var(--text-secondary)]">{d.sentAt ? new Date(d.sentAt).toLocaleString('pt-BR') : '-'}</span> },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10">
            <MessageSquare className="w-5 h-5 text-[#60A5FA]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Respostas</h2>
        </div>
        <Card className="animate-pulse h-64"><div /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10">
          <MessageSquare className="w-5 h-5 text-[#60A5FA]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Respostas</h2>
      </div>
      <Card><div>
        <Table columns={columns} data={responses} getKey={(d) => d.id} pageSize={10} />
      </div>      </Card>
      {responses.length === 0 && (
        <Card className="text-center py-12"><div>
          <MessageSquare className="w-12 h-12 mx-auto text-[var(--text-secondary)]/50 mb-4" />
          <p className="text-[var(--text-secondary)]">Nenhuma resposta recebida ainda</p>
        </div></Card>
      )}
    </div>
  );
}