import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './store/theme';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Campaigns } from './pages/Campaigns';
import { CampaignDetail } from './pages/CampaignDetail';
import { Dispatches } from './pages/Dispatches';
import { Responses } from './pages/Responses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Credits } from './pages/Credits';
import { useLocation } from 'react-router-dom';
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><AppLayout title="Dashboard"><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><AppLayout title="Leads"><Leads /></AppLayout></ProtectedRoute>} />
        <Route path="/campanhas" element={<ProtectedRoute><AppLayout title="Campanhas"><Campaigns /></AppLayout></ProtectedRoute>} />
        <Route path="/campanhas/:id" element={<ProtectedRoute><AppLayout title="Detalhe da Campanha"><CampaignDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/disparos" element={<ProtectedRoute><AppLayout title="Disparos"><Dispatches /></AppLayout></ProtectedRoute>} />
        <Route path="/respostas" element={<ProtectedRoute><AppLayout title="Respostas"><Responses /></AppLayout></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><AppLayout title="Relatórios"><Reports /></AppLayout></ProtectedRoute>} />
        <Route path="/creditos" element={<ProtectedRoute><AppLayout title="Créditos"><Credits /></AppLayout></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><AppLayout title="Configurações"><Settings /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

export function App() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return <AnimatedRoutes />;
}