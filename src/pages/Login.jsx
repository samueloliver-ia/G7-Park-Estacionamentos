import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Car, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha todos os campos!'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo ao G7 Park!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer login!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* Logo G7 Park */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'var(--brand-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(27,46,107,0.15)',
          }}>
            <Car size={32} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            G7 Park
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Gestão Inteligente de Frota</p>
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: '32px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Acesso Restrito
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
            Insira suas credenciais para continuar
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '48px', height: '52px', borderRadius: '12px' }}
                  placeholder="admin@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '48px', paddingRight: '48px', height: '52px', borderRadius: '12px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ height: '54px', fontSize: '16px', borderRadius: '14px' }}>
              {loading ? <span className="spinner" style={{ width: '22px', height: '22px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : (
                <><ArrowRight size={20} /> Entrar no Sistema</>
              )}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px' }}>
            Ainda não tem conta?{' '}
            <button 
              onClick={() => navigate('/register')} 
              style={{ color: 'var(--brand-blue)', background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
              Cadastrar estacionamento
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
          G7 Park © {new Date().getFullYear()} — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
