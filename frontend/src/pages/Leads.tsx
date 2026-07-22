import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Plus, Search, Trash2, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import api from '../services/api';
import type { Lead } from '../types';

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', city: '', company: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await api.get('/leads');
        setLeads(res.data.data || []);
      } catch (e) {
        console.error('Erro ao carregar leads:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.nome.toLowerCase().includes(search.toLowerCase()) || (l.telefone && l.telefone.includes(search));
    const matchStatus = !statusFilter || l.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const columns: Column<Lead>[] = [
    { key: 'nome', header: 'Nome' },
    { key: 'telefone', header: 'Telefone' },
    { key: 'cidade', header: 'Cidade' },
    { key: 'empresa', header: 'Empresa' },
    {
      key: 'status', header: 'Status', render: (l) => (
        <Badge variant={statusVariant(l.status.toLowerCase())}>{statusLabel(l.status.toLowerCase())}</Badge>
      )
    },
    {
      key: 'tags', header: 'Tags', render: (l) => (
        <div className="flex gap-1 flex-wrap">
          {(l.tags || []).map((t) => (
            <span key={t} className="text-xs bg-[var(--hover)] px-2 py-0.5 rounded-md text-[var(--text-secondary)]">{t}</span>
          ))}
        </div>
      )
    },
    {
      key: 'createdAt', header: 'Data', render: (l) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {new Date(l.createdAt).toLocaleDateString('pt-BR')}
        </span>
      )
    },
  ];

  const handleCreate = async () => {
    try {
      const res = await api.post('/leads', { ...newLead, status: 'NEW' });
      setLeads((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setNewLead({ name: '', phone: '', city: '', company: '' });
    } catch (e) {
      console.error('Erro ao criar lead:', e);
    }
  };

  const handleRemoveDuplicates = async () => {
    try {
      await api.delete('/leads/duplicates');
      const res = await api.get('/leads');
      setLeads(res.data.data || []);
    } catch (e) {
      console.error('Erro ao remover duplicados:', e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="w-64">
            <Input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">Todos os status</option>
            <option value="NEW">Novo</option>
            <option value="CONTACTED">Em Contato</option>
            <option value="QUALIFIED">Qualificado</option>
            <option value="CONVERTED">Convertido</option>
            <option value="LOST">Perdido</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRemoveDuplicates}>
            <Trash2 className="w-4 h-4" /> Remover Duplicados
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <Card>
        <Table columns={columns} data={filtered} getKey={(l) => l.id} pageSize={10} />
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Lead">
        <div className="space-y-4">
          <Input label="Nome" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
          <Input label="Telefone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
          <Input label="Cidade" value={newLead.city} onChange={(e) => setNewLead({ ...newLead, city: e.target.value })} />
          <Input label="Empresa" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} />
          <Button className="w-full" onClick={handleCreate}>Criar Lead</Button>
        </div>
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar Leads">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)] mb-2">Arraste arquivos CSV ou XLSX aqui</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const formData = new FormData();
                  formData.append('file', file);
                  api.post(`/leads/import/${file.name.endsWith('.csv') ? 'csv' : 'xlsx'}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  })
                    .then(() => { setShowImport(false); window.location.reload(); })
                    .catch(() => {});
                }
              }}
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Formatos aceitos: CSV, XLSX. Colunas obrigatórias: nome, telefone</p>
        </div>
      </Modal>
    </motion.div>
  );
}