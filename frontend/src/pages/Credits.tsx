import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle, XCircle, Loader2, Copy, Check, QrCode } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, statusVariant, statusLabel } from '../components/ui/Badge';
import { payments } from '../services/api';
import type { PaymentPlan } from '../types';

interface PixPaymentData {
  paymentId: string;
  qrCode?: string;
  qrCodeBase64?: string;
  amount: number;
  credits: number;
  status: string;
}

export function Credits() {
  const [balance, setBalance] = useState(0);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activePayment, setActivePayment] = useState<PixPaymentData | null>(null);
  const [polling, setPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [balanceRes, plansRes] = await Promise.all([
          payments.getBalance(),
          payments.getPlans(),
        ]);
        setBalance(balanceRes.data.balance);
        setPlans(plansRes.data);
      } catch (e) {
        console.error('Erro ao carregar créditos:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!activePayment || activePayment.status === 'approved' || !polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await payments.getStatus(activePayment.paymentId);
        if (res.data.status === 'APPROVED' || res.data.mercadoPagoStatus === 'approved') {
          setBalance((b) => b + activePayment.credits);
          setTransactions((prev) => [
            { id: activePayment.paymentId, amount: activePayment.credits, status: 'APPROVED', createdAt: new Date().toISOString() },
            ...prev,
          ]);
          setActivePayment((p) => p ? { ...p, status: 'approved' } : null);
          setPolling(false);
        }
      } catch (e) {
        console.error('Erro ao verificar status:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activePayment, polling]);

  const handlePurchase = async (planId: string) => {
    try {
      setProcessing(planId);
      const res = await payments.create(planId);

      if (res.data.qrCode || res.data.qrCodeBase64) {
        setActivePayment({
          paymentId: res.data.paymentId,
          qrCode: res.data.qrCode,
          qrCodeBase64: res.data.qrCodeBase64,
          amount: res.data.amount,
          credits: res.data.credits,
          status: 'pending',
        });
        setPolling(true);
      } else if (res.data.checkoutUrl && res.data.checkoutUrl.startsWith('mock://')) {
        await payments.confirm(res.data.paymentId);
        setBalance((b) => b + res.data.credits);
        setTransactions((prev) => [
          { id: res.data.paymentId, amount: res.data.credits, status: 'APPROVED', createdAt: new Date().toISOString() },
          ...prev,
        ]);
        alert(`Recarga de ${res.data.credits} créditos confirmada! (modo teste)`);
      } else {
        window.open(res.data.checkoutUrl, '_blank');
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao criar pagamento');
    } finally {
      setProcessing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmManualPayment = async () => {
    if (!activePayment) return;
    try {
      await payments.confirm(activePayment.paymentId);
      setBalance((b) => b + activePayment.credits);
      setTransactions((prev) => [
        { id: activePayment.paymentId, amount: activePayment.credits, status: 'APPROVED', createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setActivePayment((p) => p ? { ...p, status: 'approved' } : null);
      setPolling(false);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao confirmar pagamento');
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10">
            <Wallet className="w-5 h-5 text-[#60A5FA]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Créditos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse h-40"><div /></Card>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10">
          <Wallet className="w-5 h-5 text-[#60A5FA]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Créditos</h2>
      </div>

      {activePayment && activePayment.status !== 'approved' && (
        <Card className="border-[#2563EB]/30">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">Pagamento PIX</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Valor: <span className="font-semibold text-[var(--text-primary)]">R$ {activePayment.amount.toFixed(2)}</span>
                <br />
                Créditos: <span className="font-semibold text-[var(--text-primary)]">{activePayment.credits.toLocaleString()}</span>
              </p>

              {activePayment.qrCodeBase64 && (
                <div className="mb-4">
                  <img src={`data:image/png;base64,${activePayment.qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48 rounded-xl border border-[var(--border)]" />
                </div>
              )}

              {activePayment.qrCode && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">PIX Copia e Cola:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs break-all bg-[var(--hover)]/30 px-3 py-2 rounded-lg border border-[var(--border)]">{activePayment.qrCode}</code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(activePayment.qrCode!)}>
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Button className="w-full md:w-auto" onClick={confirmManualPayment} variant="secondary">
                  <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Pagamento Manual
                </Button>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  O pagamento é confirmado automaticamente pelo webhook. Use este botão apenas para testes.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <div className="text-center py-6">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Saldo disponível</p>
            <p className="text-4xl font-bold text-[#10B981]">{balance.toFixed(2)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">créditos</p>
            <p className="text-xs text-[var(--text-secondary)] mt-4">
              R$ 0,04 por disparo (Evolution) <br />
              R$ 0,06 por disparo (API Oficial)
            </p>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Comprar créditos</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 flex flex-col items-center text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">{plan.label}</p>
                <p className="text-2xl font-bold text-[#60A5FA] mt-1">{(plan.amount / plan.credits * 1000).toFixed(1)}¢</p>
                <p className="text-xs text-[var(--text-secondary)]">por 1k créditos</p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">{plan.credits.toLocaleString()} créditos</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">R$ {plan.amount.toFixed(2)}</p>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => handlePurchase(plan.id)}
                  disabled={processing === plan.id || (activePayment?.status !== null && activePayment?.status !== 'approved')}
                >
                  {processing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Comprar'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {transactions.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Histórico</h3>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
                <div className="flex items-center gap-3">
                  {tx.amount > 0 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{tx.amount > 0 ? 'Recarga' : 'Cobrança de disparo'}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{new Date(tx.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </p>
                  <Badge variant={statusVariant(tx.status === 'APPROVED' ? 'aprovado' : 'pendente')}>
                    {statusLabel(tx.status === 'APPROVED' ? 'aprovado' : 'pendente')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}
