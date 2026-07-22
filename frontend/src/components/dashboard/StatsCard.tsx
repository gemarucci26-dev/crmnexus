import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  change?: number;
}

export function StatsCard({ icon: Icon, title, value, change }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const isNumeric = typeof value === 'number';

  useEffect(() => {
    if (!isNumeric) return;
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, isNumeric]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10">
          <Icon className="w-5 h-5 text-[#60A5FA]" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">
        {isNumeric ? displayValue : value}
      </p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">{title}</p>
    </motion.div>
  );
}
