import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import api from '../services/api';

export function Reports() {
  const [period, setPeriod] = useState('6m');
  const [conversionData, setConversionData] = useState<Array<{ name: string; value: number }>>([]);
  const [leadsOverTime, setLeadsOverTime] = useState<Array<{ name: string; value: number }>>([]);
  const [costData, setCostData] = useState<Array<{ name: string; value: number; value2: number }>>([]);
  const [roiData, setRoiData] = useState<Array<{ name: string; value: number }>>([]);
  const [comparisonData, setComparisonData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await api.get('/reports');
        const data = res.data;

        setConversionData(data.conversionOverTime || []);
        setLeadsOverTime(data.leadsOverTime || []);
        setCostData(data.costOverTime || []);
        setRoiData(data.roiOverTime || []);
        setComparisonData([
          { name: 'Campanhas', value: data.totalCampaigns || 0 },
          { name: 'Leads', value: data.totalLeads || 0 },
          { name: 'Respostas', value: data.totalResponses || 0 },
          { name: 'Qualificados', value: data.qualifiedLeads || 0 },
          { name: 'Convertidos', value: data.convertedLeads || 0 },
        ]);
      } catch (e) {
        console.error('Erro ao carregar relatórios:', e);
        setConversionData([]);
        setLeadsOverTime([]);
        setCostData([]);
        setRoiData([]);
        setComparisonData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [period]);

  const kpis = loading ? [
    { label: 'Taxa de Conversão', value: '---', sub: '---' },
    { label: 'CPL Médio', value: '---', sub: '---' },
    { label: 'ROI', value: '---', sub: '---' },
    { label: 'Leads Respondidos', value: '---', sub: '---' },
  ] : [
    { label: 'Taxa de Conversão', value: conversionData.length ? `${conversionData[conversionData.length - 1].value}%` : '0%', sub: '+5% vs mês anterior' },
    { label: 'CPL Médio', value: costData.length ? `R$ ${costData[costData.length - 1].value.toFixed(2)}` : 'R$ 0,00', sub: '-7% vs mês anterior' },
    { label: 'ROI', value: roiData.length ? `${roiData[roiData.length - 1].value.toFixed(1)}x` : '0x', sub: '+12% vs mês anterior' },
    { label: 'Leads Respondidos', value: comparisonData.find(d => d.name === 'Respostas')?.value?.toString() || '0', sub: '+8% vs mês anterior' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Relatórios</h2>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="1m">Último mês</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último ano</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/reports/export/csv', '_blank')}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/reports/export/xlsx', '_blank')}>
            <Download className="w-4 h-4" /> XLSX
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs text-[var(--text-secondary)]">{kpi.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpi.value}</p>
            <p className="text-xs text-emerald-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Taxa de Conversão</h3>
          <div className="space-y-2">
            {conversionData.length === 0 && <p className="text-xs text-[var(--text-secondary)]">Sem dados no período</p>}
            {conversionData.slice(-6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{item.name}</span>
                <span className="font-medium text-[var(--text-primary)]">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Leads ao Longo do Tempo</h3>
          <div className="space-y-2">
            {leadsOverTime.length === 0 && <p className="text-xs text-[var(--text-secondary)]">Sem dados no período</p>}
            {leadsOverTime.slice(-6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{item.name}</span>
                <span className="font-medium text-[var(--text-primary)]">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Custo por Lead</h3>
          <div className="space-y-2">
            {costData.length === 0 && <p className="text-xs text-[var(--text-secondary)]">Sem dados no período</p>}
            {costData.slice(-6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{item.name}</span>
                <div className="text-right">
                  <span className="font-medium text-[var(--text-primary)]">R$ {item.value.toFixed(2)}</span>
                  {item.value2 != null && <span className="text-xs text-[var(--text-secondary)] ml-2">R$ {item.value2.toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">ROI por Mês</h3>
          <div className="space-y-2">
            {roiData.length === 0 && <p className="text-xs text-[var(--text-secondary)]">Sem dados no período</p>}
            {roiData.slice(-6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{item.name}</span>
                <span className="font-medium text-[var(--text-primary)]">{item.value.toFixed(1)}x</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
