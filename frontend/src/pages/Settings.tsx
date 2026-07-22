import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Key, Sun, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import api from '../services/api';

type Tab = 'perfil' | 'senha' | 'notificacoes' | 'api' | 'tema' | 'whatsapp';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'senha', label: 'Senha', icon: Lock },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'api', label: 'API & Webhooks', icon: Key },
  { id: 'tema', label: 'Tema', icon: Sun },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const { user, setUser } = useAuthStore();
  const { mode, toggle } = useThemeStore();

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [notifications, setNotifications] = useState({ email: true, push: true, dispatch: true, response: false });
  const [apiKey] = useState('nxs_k8f2j7d9a3m5p1q6r4t0y2w4x6z8');
  const [webhook, setWebhook] = useState('');

  // WhatsApp / Evolution API
  const [waConfig, setWaConfig] = useState({ apiUrl: 'http://localhost:8080', apiKey: '', instanceName: '' });
  const [waLoading, setWaLoading] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    api.get('/settings/whatsapp').then((res) => {
      setWaConfig({ apiUrl: res.data.apiUrl || 'http://localhost:8080', apiKey: '', instanceName: res.data.instanceName || '' });
    }).catch(() => {});
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === id
                ? 'bg-[#2563EB]/15 text-[#60A5FA]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--hover)]'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {activeTab === 'perfil' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Informações do Perfil</h3>
          <div className="space-y-4 max-w-md">
            <Input label="Nome" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="E-mail" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <Button onClick={() => setUser({ ...user!, name: profile.name, email: profile.email })}>Salvar Alterações</Button>
          </div>
        </Card>
      )}

      {/* Senha */}
      {activeTab === 'senha' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Alterar Senha</h3>
          <div className="space-y-4 max-w-md">
            <Input label="Senha atual" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            <Input label="Nova senha" type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} />
            <Input label="Confirmar nova senha" type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            <Button onClick={() => setPasswords({ current: '', new: '', confirm: '' })}>Alterar Senha</Button>
          </div>
        </Card>
      )}

      {/* Notificações */}
      {activeTab === 'notificacoes' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Preferências de Notificação</h3>
          <div className="space-y-4">
            {([
              { key: 'email' as const, label: 'Notificações por e-mail', desc: 'Receba atualizações no seu e-mail' },
              { key: 'push' as const, label: 'Notificações push', desc: 'Notificações no navegador' },
              { key: 'dispatch' as const, label: 'Alertas de disparo', desc: 'Quando campanhas iniciam ou concluem' },
              { key: 'response' as const, label: 'Alertas de resposta', desc: 'Quando leads respondem mensagens' },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-[var(--hover)]/30">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${notifications[key] ? 'bg-[#2563EB]' : 'bg-[var(--hover)]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* API */}
      {activeTab === 'api' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">API & Webhooks</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">API Key</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={apiKey}
                  className="flex-1 rounded-xl border bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] font-mono"
                  style={{ borderColor: 'var(--border)' }}
                />
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(apiKey)}>Copiar</Button>
              </div>
            </div>
            <Input label="Webhook URL" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://seu-servidor.com/webhook" />
            <Button onClick={() => {}}>Salvar Webhook</Button>
          </div>
        </Card>
      )}

      {/* WhatsApp */}
      {activeTab === 'whatsapp' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Evolution API (WhatsApp)</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Configure a Evolution API para enviar mensagens reais pelo WhatsApp.
            Instale via Docker: <code className="bg-[var(--hover)] px-1 rounded">docker compose up -d</code> em <a href="https://github.com/EvolutionAPI/evolution-api" target="_blank" className="text-[#60A5FA] underline">github.com/EvolutionAPI</a>
          </p>
          <div className="space-y-4 max-w-md">
            <Input
              label="URL da API"
              value={waConfig.apiUrl}
              onChange={(e) => setWaConfig({ ...waConfig, apiUrl: e.target.value })}
              placeholder="http://localhost:8080"
            />
            <Input
              label="API Key"
              type="password"
              value={waConfig.apiKey}
              onChange={(e) => setWaConfig({ ...waConfig, apiKey: e.target.value })}
              placeholder="Sua API key da Evolution API"
            />
            <Input
              label="Nome da Instância"
              value={waConfig.instanceName}
              onChange={(e) => setWaConfig({ ...waConfig, instanceName: e.target.value })}
              placeholder="Ex: minha-instancia"
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setWaLoading(true);
                  setWaTestResult(null);
                  try {
                    const res = await api.put('/settings/whatsapp', waConfig);
                    if (res.data.ok) {
                      const test = await api.post('/settings/whatsapp/test');
                      setWaTestResult(test.data.ok
                        ? { ok: true, message: 'Conectado com sucesso!' }
                        : { ok: false, message: test.data.error || 'Falha ao conectar' });
                    }
                  } catch (e: any) {
                    setWaTestResult({ ok: false, message: e.response?.data?.error || 'Erro ao salvar' });
                  } finally {
                    setWaLoading(false);
                  }
                }}
                loading={waLoading}
              >
                Salvar e Testar Conexão
              </Button>
            </div>
            {waTestResult && (
              <div className={`rounded-xl px-4 py-2.5 text-sm ${waTestResult.ok ? 'bg-green-500/20 border border-green-400/30 text-green-100' : 'bg-red-500/20 border border-red-400/30 text-red-100'}`}>
                {waTestResult.message}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tema */}
      {activeTab === 'tema' && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Aparência</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => mode !== 'dark' && toggle()}
              className={`rounded-2xl border-2 p-6 text-center transition-all cursor-pointer ${mode === 'dark' ? 'border-[#2563EB]' : 'border-[var(--border)]'}`}
            >
              <div className="w-12 h-8 mx-auto mb-2 rounded-lg bg-[#07111F] border border-white/10" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Dark</p>
            </button>
            <button
              onClick={() => mode !== 'light' && toggle()}
              className={`rounded-2xl border-2 p-6 text-center transition-all cursor-pointer ${mode === 'light' ? 'border-[#2563EB]' : 'border-[var(--border)]'}`}
            >
              <div className="w-12 h-8 mx-auto mb-2 rounded-lg bg-[#F2F6FC] border border-black/10" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Light</p>
            </button>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
