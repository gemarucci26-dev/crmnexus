import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'default' | 'info';
}

const variants = {
  info: 'bg-[#2563EB]/15 text-[#60A5FA] border-[#2563EB]/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  default: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const statusMap: Record<string, BadgeProps['variant']> = {
  novo: 'info',
  contato: 'default',
  qualificado: 'success',
  convertido: 'success',
  perdido: 'error',
  rascunho: 'default',
  agendada: 'warning',
  executando: 'info',
  pausada: 'warning',
  concluida: 'success',
  cancelada: 'error',
  pendente: 'warning',
  enviado: 'info',
  entregue: 'success',
  lido: 'success',
  respondido: 'success',
  falhou: 'error',
};

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function statusVariant(status: string): BadgeProps['variant'] {
  return statusMap[status] || 'default';
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    novo: 'Novo',
    contato: 'Em Contato',
    qualificado: 'Qualificado',
    convertido: 'Convertido',
    perdido: 'Perdido',
    rascunho: 'Rascunho',
    agendada: 'Agendada',
    executando: 'Executando',
    pausada: 'Pausada',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    pendente: 'Pendente',
    enviado: 'Enviado',
    entregue: 'Entregue',
    lido: 'Lido',
    respondido: 'Respondido',
    falhou: 'Falhou',
  };
  return labels[status] || status;
}
