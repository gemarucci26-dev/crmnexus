import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.accessToken);
      setLoading(false);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Credenciais inválidas');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <img src="/logo.png" alt="NEXUS" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white">NEXUS</h1>
          <p className="text-white/70 text-sm mt-1">Sistema de Gestão de Leads</p>
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Entrar na sua conta</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-2.5 text-sm text-red-100">
                {error}
              </div>
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              className="[& input]:bg-white/10 [& input]:border-white/20 [& input]:text-white [& input]::placeholder:text-white/40 [& input]:focus:border-white/40 [& label]:text-white/70"
            />
            <div className="relative">
              <Input
                label="Senha"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                className="[& input]:bg-white/10 [& input]:border-white/20 [& input]:text-white [& input]::placeholder:text-white/40 [& input]:focus:border-white/40 [& label]:text-white/70"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-[34px] text-white/50 hover:text-white/80 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="submit" loading={loading} size="lg" className="w-full !bg-white !text-[#1E40AF] hover:!bg-white/90 !shadow-none">
              Entrar
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-white/60">
            Não tem conta?{' '}
            <Link to="/register" className="text-white font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}