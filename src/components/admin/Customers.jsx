import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, UserPlus, Search, Phone, Car, Calendar, Users, Edit2, Trash2, Check, X, Crown, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Customers({ onBack }) {
  const { currentUser } = useApp();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [form, setForm] = useState({
    name: '', plate: '', whatsapp: '', customer_type: 'diario',
    monthly_fee: '', due_day: 10, notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('parking_id', currentUser.parkingId)
      .eq('status', 'ativo')
      .order('name');
    setCustomers(data || []);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formatPlate = (v) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return clean.slice(0, 3) + '-' + clean.slice(3);
    return clean.slice(0, 3) + '-' + clean.slice(3, 7);
  };

  const formatWhatsApp = (v) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length <= 2) return clean.length ? `(${clean}` : '';
    if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  const resetForm = () => {
    setForm({ name: '', plate: '', whatsapp: '', customer_type: 'diario', monthly_fee: '', due_day: 10, notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.plate) { toast.error('Nome e placa são obrigatórios!'); return; }
    if (form.customer_type === 'mensal' && !form.monthly_fee) { toast.error('Informe o valor da mensalidade!'); return; }
    setSaving(true);
    try {
      const payload = {
        parking_id: currentUser.parkingId,
        name: form.name,
        plate: form.plate.replace('-', '').toUpperCase(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        customer_type: form.customer_type,
        monthly_fee: form.customer_type === 'mensal' ? Number(form.monthly_fee) : 0,
        due_day: form.customer_type === 'mensal' ? Number(form.due_day) : 10,
        notes: form.notes || null,
      };
      if (editingId) {
        await supabase.from('customers').update(payload).eq('id', editingId);
        toast.success('Cliente atualizado!');
      } else {
        await supabase.from('customers').insert([payload]);
        toast.success('Cliente cadastrado!');
      }
      resetForm();
      loadCustomers();
    } catch (err) {
      toast.error('Erro ao salvar!');
    } finally { setSaving(false); }
  };

  const handleEdit = (c) => {
    setForm({
      name: c.name,
      plate: formatPlate(c.plate),
      whatsapp: formatWhatsApp(c.whatsapp || ''),
      customer_type: c.customer_type,
      monthly_fee: c.monthly_fee ? String(c.monthly_fee) : '',
      due_day: c.due_day || 10,
      notes: c.notes || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Desativar este cliente?')) return;
    await supabase.from('customers').update({ status: 'inativo' }).eq('id', id);
    toast.success('Cliente desativado.');
    loadCustomers();
  };

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.plate.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'todos' || c.customer_type === filterType;
    return matchSearch && matchType;
  });

  const mensalistas = customers.filter(c => c.customer_type === 'mensal');
  const avulsos = customers.filter(c => c.customer_type === 'diario');

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Users size={20} color="#8b5cf6" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Clientes</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          <UserPlus size={16} /> Novo
        </button>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div className="stat-card" style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--brand-blue)' }}>{customers.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center', padding: '12px', borderColor: 'rgba(139,92,246,0.3)' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#8b5cf6' }}>{mensalistas.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>MENSAIS</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center', padding: '12px', borderColor: 'rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b' }}>{avulsos.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>DIÁRIOS</div>
          </div>
        </div>

        {/* Quick Registration Form */}
        {showForm && (
          <div className="card mb-4" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
            <div className="section-title">
              <UserPlus size={18} color="#8b5cf6" /> {editingId ? 'Editar Cliente' : 'Cadastro Rápido'}
            </div>

            {/* Step 1: Nome */}
            <div className="form-group">
              <label className="form-label">👤 Nome do Cliente *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Ex: João Silva" autoFocus />
            </div>

            {/* Step 2: Placa */}
            <div className="form-group">
              <label className="form-label">🚗 Placa do Veículo *</label>
              <input className="form-input" value={form.plate}
                onChange={e => set('plate', formatPlate(e.target.value))}
                placeholder="ABC-1234" maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', fontSize: '18px' }}
              />
            </div>

            {/* Step 3: WhatsApp */}
            <div className="form-group">
              <label className="form-label">📱 WhatsApp</label>
              <input className="form-input" value={form.whatsapp}
                onChange={e => set('whatsapp', formatWhatsApp(e.target.value))}
                placeholder="(00) 00000-0000" maxLength={16}
              />
            </div>

            {/* Step 4: Tipo */}
            <div className="form-group">
              <label className="form-label">📋 Tipo de Cliente</label>
              <div className="flex gap-3">
                <button
                  onClick={() => set('customer_type', 'diario')}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px',
                    border: `2px solid ${form.customer_type === 'diario' ? '#f59e0b' : 'var(--border)'}`,
                    background: form.customer_type === 'diario' ? 'rgba(245,158,11,0.1)' : 'var(--bg-input)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    color: form.customer_type === 'diario' ? '#f59e0b' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Clock size={24} />
                  <span style={{ fontWeight: '700', fontSize: '13px' }}>Diário/Avulso</span>
                </button>
                <button
                  onClick={() => set('customer_type', 'mensal')}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px',
                    border: `2px solid ${form.customer_type === 'mensal' ? '#8b5cf6' : 'var(--border)'}`,
                    background: form.customer_type === 'mensal' ? 'rgba(139,92,246,0.1)' : 'var(--bg-input)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    color: form.customer_type === 'mensal' ? '#8b5cf6' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Crown size={24} />
                  <span style={{ fontWeight: '700', fontSize: '13px' }}>Mensalista</span>
                </button>
              </div>
            </div>

            {/* Campos Mensal */}
            {form.customer_type === 'mensal' && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">💰 Mensalidade (R$)</label>
                  <input type="number" step="0.01" className="form-input" value={form.monthly_fee}
                    onChange={e => set('monthly_fee', e.target.value)} placeholder="150,00" />
                </div>
                <div className="form-group">
                  <label className="form-label">📅 Dia Vencimento</label>
                  <select className="form-input" value={form.due_day} onChange={e => set('due_day', Number(e.target.value))}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2" style={{ marginTop: '8px' }}>
              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> :
                  <><Check size={16} /> {editingId ? 'Atualizar' : 'Cadastrar'}</>}
              </button>
              <button className="btn btn-ghost" onClick={resetForm}><X size={16} /></button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="tabs" style={{ marginBottom: '12px' }}>
          {[{ id: 'todos', l: 'Todos' }, { id: 'mensal', l: '👑 Mensais' }, { id: 'diario', l: '🕐 Diários' }].map(t => (
            <button key={t.id} className={`tab ${filterType === t.id ? 'active' : ''}`} onClick={() => setFilterType(t.id)}>{t.l}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: '44px' }}
            placeholder="Buscar nome ou placa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p>{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(c => (
              <div key={c.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px',
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {/* Type badge */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: c.customer_type === 'mensal' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {c.customer_type === 'mensal' ?
                    <Crown size={22} color="#8b5cf6" /> :
                    <Clock size={22} color="#f59e0b" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', marginBottom: '2px', fontSize: '15px' }}>{c.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600', letterSpacing: '1px' }}>{c.plate}</span>
                    {c.whatsapp && (
                      <a href={`https://wa.me/55${c.whatsapp}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#25d366', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                        <Phone size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                  {c.customer_type === 'mensal' && (
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '600', marginTop: '2px' }}>
                      R$ {Number(c.monthly_fee).toFixed(2)} · Venc. dia {c.due_day}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(c)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={14} color="#ef4444" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
