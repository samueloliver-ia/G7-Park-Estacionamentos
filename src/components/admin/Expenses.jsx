import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Receipt, Plus, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORIES = ['aluguel', 'energia', 'agua', 'salarios', 'manutencao', 'outros'];
const CAT_LABELS = { aluguel: '🏠 Aluguel', energia: '⚡ Energia', agua: '💧 Água', salarios: '👥 Salários', manutencao: '🔧 Manutenção', outros: '📦 Outros' };

export default function Expenses({ onBack }) {
  const { currentUser } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', category: 'outros', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_status: 'pendente', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from('expenses').select('*').eq('parking_id', currentUser.parkingId).order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.description || !form.amount) { toast.error('Preencha descrição e valor!'); return; }
    setSaving(true);
    try {
      await supabase.from('expenses').insert([{ parking_id: currentUser.parkingId, ...form, amount: Number(form.amount) }]);
      toast.success('Despesa cadastrada!');
      setShowForm(false);
      setForm({ description: '', category: 'outros', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_status: 'pendente', notes: '' });
      loadExpenses();
    } catch { toast.error('Erro ao salvar!'); } finally { setSaving(false); }
  };

  const togglePaid = async (exp) => {
    const newStatus = exp.payment_status === 'pago' ? 'pendente' : 'pago';
    await supabase.from('expenses').update({ payment_status: newStatus }).eq('id', exp.id);
    loadExpenses();
  };

  const deleteExp = async (id) => {
    if (!confirm('Excluir esta despesa?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadExpenses();
    toast.success('Despesa removida!');
  };

  const totalPending = expenses.filter(e => e.payment_status === 'pendente').reduce((s, e) => s + Number(e.amount), 0);
  const totalPaid = expenses.filter(e => e.payment_status === 'pago').reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Receipt size={20} color="#ef4444" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Despesas</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          <Plus size={16} /> Nova
        </button>
      </div>
      <div className="page-content">
        {/* Totals */}
        <div className="grid-2 mb-4">
          <div className="stat-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>PENDENTE</div>
            <div className="stat-value" style={{ color: '#ef4444', fontSize: '22px' }}>R$ {totalPending.toFixed(2)}</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>PAGO</div>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '22px' }}>R$ {totalPaid.toFixed(2)}</div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card mb-4">
            <div className="section-title">Nova Despesa</div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Aluguel mensal" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-danger btn-full" onClick={handleAdd} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : <><Plus size={16} /> Salvar</>}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {expenses.map(exp => (
              <div key={exp.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px',
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>{exp.description}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {CAT_LABELS[exp.category]} · {format(new Date(exp.expense_date + 'T12:00'), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', color: exp.payment_status === 'pago' ? '#10b981' : '#ef4444' }}>
                    R$ {Number(exp.amount).toFixed(2)}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
                    background: exp.payment_status === 'pago' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: exp.payment_status === 'pago' ? '#10b981' : '#ef4444',
                  }}>
                    {exp.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => togglePaid(exp)} title={exp.payment_status === 'pago' ? 'Marcar pendente' : 'Marcar pago'}>
                    <CheckCircle size={16} color={exp.payment_status === 'pago' ? '#10b981' : 'var(--text-muted)'} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteExp(exp.id)}>
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Nenhuma despesa cadastrada.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
