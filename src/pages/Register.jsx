import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Car, User, Mail, MapPin, Hash, Lock, ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    ownerName: '', email: '', parkingName: '', address: '', cep: '', password: '', confirmPassword: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) set('address', `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
      } catch (e) {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ownerName || !form.email || !form.parkingName || !form.password) {
      toast.error('Preencha todos os campos obrigatórios!'); return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Senhas não coincidem!'); return;
    }
    if (form.password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres!'); return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Estacionamento cadastrado com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Erro ao cadastrar!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'var(--brand-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 6px 16px rgba(27,46,107,0.15)',
          }}>
            <Car size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            G7 Park
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>Cadastre seu estabelecimento</p>
        </div>

        <div className="card" style={{ padding: '32px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Novo Cadastro
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome do Proprietário *</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                  <input className="form-input" style={{ paddingLeft: '42px', borderRadius: '10px' }} placeholder="João Silva"
                    value={form.ownerName} onChange={e => set('ownerName', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nome do Estacionamento *</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                  <input className="form-input" style={{ paddingLeft: '42px', borderRadius: '10px' }} placeholder="G7 Park Centro"
                    value={form.parkingName} onChange={e => set('parkingName', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                <input type="email" className="form-input" style={{ paddingLeft: '42px', borderRadius: '10px' }} placeholder="email@exemplo.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">CEP</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                  <input className="form-input" style={{ paddingLeft: '42px', borderRadius: '10px' }} placeholder="00000-000" maxLength={9}
                    value={form.cep} onChange={e => {
                      set('cep', e.target.value);
                      if (e.target.value.replace(/\D/g, '').length === 8) fetchCep(e.target.value);
                    }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                  <input className="form-input" style={{ paddingLeft: '42px', borderRadius: '10px' }} placeholder="Auto preenchido pelo CEP"
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Senha *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                  <input type={showPass ? 'text' : 'password'} className="form-input" style={{ paddingLeft: '42px', paddingRight: '42px', borderRadius: '10px' }}
                    placeholder="Mín. 6 caracteres" value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Senha *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-blue-light)' }} />
                  <input type="password" className="form-input" style={{ paddingLeft: '42px', borderRadius: '10px' }}
                    placeholder="Repita a senha" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '16px', height: '54px', fontSize: '16px', borderRadius: '14px' }}>
              {loading ? <><span className="spinner" style={{ width: '22px', height: '22px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Cadastrando...</> : 'Cadastrar Estacionamento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
