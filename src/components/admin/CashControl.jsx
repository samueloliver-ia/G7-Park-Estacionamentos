import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Plus, Printer, Calendar, DollarSign, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { printer } from '../../lib/bluetooth-printer';

export default function CashControl({ onBack }) {
  const { currentUser, parkingConfig } = useApp();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [movements, setMovements] = useState([]);
  const [vehicleRevenue, setVehicleRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'entrada', category: 'avulso', description: '', amount: '',
    payment_method: 'dinheiro',
  });

  useEffect(() => { loadData(); }, [date]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: moves }, { data: vehicles }] = await Promise.all([
      supabase.from('cash_movements').select('*').eq('parking_id', currentUser.parkingId)
        .eq('movement_date', date).order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').eq('parking_id', currentUser.parkingId)
        .eq('status', 'saiu').gte('exit_time', date + 'T00:00:00').lte('exit_time', date + 'T23:59:59'),
    ]);
    setMovements(moves || []);
    setVehicleRevenue(vehicles || []);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const CATEGORIES_IN = [
    { id: 'avulso', label: '🚗 Veíc. Avulso' },
    { id: 'mensalidade', label: '👑 Mensalidade' },
    { id: 'outros_entrada', label: '📦 Outros' },
  ];
  const CATEGORIES_OUT = [
    { id: 'aluguel', label: '🏠 Aluguel' },
    { id: 'energia', label: '⚡ Energia' },
    { id: 'agua', label: '💧 Água' },
    { id: 'salarios', label: '👥 Salários' },
    { id: 'manutencao', label: '🔧 Manutenção' },
    { id: 'outros_saida', label: '📦 Outros' },
  ];

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast.error('Preencha descrição e valor!'); return; }
    setSaving(true);
    try {
      await supabase.from('cash_movements').insert([{
        parking_id: currentUser.parkingId,
        type: form.type,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        reference_type: 'manual',
        movement_date: date,
      }]);
      toast.success('Lançamento registrado!');
      setShowForm(false);
      setForm({ type: 'entrada', category: 'avulso', description: '', amount: '', payment_method: 'dinheiro' });
      loadData();
    } catch { toast.error('Erro ao salvar!'); } finally { setSaving(false); }
  };

  // Cálculos
  const vehicleIncome = vehicleRevenue.reduce((s, v) => s + Number(v.amount_charged || 0), 0);
  const manualIncome = movements.filter(m => m.type === 'entrada').reduce((s, m) => s + Number(m.amount), 0);
  const totalIncome = vehicleIncome + manualIncome;
  const totalExpense = movements.filter(m => m.type === 'saida').reduce((s, m) => s + Number(m.amount), 0);
  const balance = totalIncome - totalExpense;

  const handlePrint = async () => {
    if (printer.connected) {
      try {
        await printer.printDailyReport({
          parkingName: parkingConfig?.parking_name,
          date: format(new Date(date + 'T12:00'), 'dd/MM/yyyy'),
          totalVehicles: vehicleRevenue.length,
          totalRevenue: totalIncome,
          totalExpenses: totalExpense,
          balance,
          movements,
        });
        toast.success('Relatório enviado para impressora!');
      } catch { toast.error('Erro ao imprimir!'); }
    } else {
      // Fallback: imprimir via browser
      window.print();
    }
  };

  const formattedDate = format(new Date(date + 'T12:00'), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Wallet size={20} color="#10b981" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Caixa Diário</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={handlePrint} className="btn btn-ghost btn-sm"><Printer size={16} /></button>
        </div>
      </div>

      <div className="page-content">
        {/* Date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Calendar size={18} color="var(--brand-blue)" />
          <input type="date" className="form-input" style={{ flex: 1 }} value={date}
            onChange={e => setDate(e.target.value)} />
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'capitalize', fontWeight: '500' }}>
          {formattedDate}
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {/* Entradas */}
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '14px', padding: '14px', textAlign: 'center',
          }}>
            <ArrowDownCircle size={20} color="#10b981" style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>ENTRADAS</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>R$ {totalIncome.toFixed(2)}</div>
          </div>

          {/* Saídas */}
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '14px', padding: '14px', textAlign: 'center',
          }}>
            <ArrowUpCircle size={20} color="#ef4444" style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>SAÍDAS</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>R$ {totalExpense.toFixed(2)}</div>
          </div>

          {/* Saldo */}
          <div style={{
            background: balance >= 0 ? 'rgba(26,106,245,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${balance >= 0 ? 'rgba(26,106,245,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: '14px', padding: '14px', textAlign: 'center',
          }}>
            <DollarSign size={20} color={balance >= 0 ? 'var(--brand-blue)' : '#ef4444'} style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '10px', fontWeight: '700', color: balance >= 0 ? 'var(--brand-blue)' : '#ef4444', marginBottom: '4px' }}>SALDO</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: balance >= 0 ? 'var(--brand-blue)' : '#ef4444' }}>R$ {balance.toFixed(2)}</div>
          </div>
        </div>

        {/* Auto vehicle revenue */}
        {vehicleRevenue.length > 0 && (
          <div className="card mb-4" style={{ padding: '14px 16px' }}>
            <div className="section-title" style={{ fontSize: '14px', marginBottom: '10px' }}>
              🚗 Veículos do Dia ({vehicleRevenue.length})
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Receita automática de estacionamento avulso
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
              R$ {vehicleIncome.toFixed(2)}
            </div>
          </div>
        )}

        {/* Add movement button */}
        <button className="btn btn-primary btn-full mb-4" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Novo Lançamento
        </button>

        {/* Form */}
        {showForm && (
          <div className="card mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="section-title" style={{ margin: 0 }}>Novo Lançamento</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={14} /></button>
            </div>

            {/* Type */}
            <div className="form-group">
              <div className="flex gap-3">
                <button onClick={() => { set('type', 'entrada'); set('category', 'avulso'); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: `2px solid ${form.type === 'entrada' ? '#10b981' : 'var(--border)'}`,
                    background: form.type === 'entrada' ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)',
                    color: form.type === 'entrada' ? '#10b981' : 'var(--text-secondary)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                  <ArrowDownCircle size={18} /> Entrada
                </button>
                <button onClick={() => { set('type', 'saida'); set('category', 'aluguel'); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: `2px solid ${form.type === 'saida' ? '#ef4444' : 'var(--border)'}`,
                    background: form.type === 'saida' ? 'rgba(239,68,68,0.1)' : 'var(--bg-input)',
                    color: form.type === 'saida' ? '#ef4444' : 'var(--text-secondary)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                  <ArrowUpCircle size={18} /> Saída
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                {(form.type === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT).map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Ex: Pagamento cliente João" />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input type="number" step="0.01" className="form-input" value={form.amount}
                  onChange={e => set('amount', e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Pagamento</label>
                <select className="form-input" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">📱 PIX</option>
                  <option value="cartao_debito">💳 Débito</option>
                  <option value="cartao_credito">💳 Crédito</option>
                </select>
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : <><Plus size={16} /> Salvar</>}
            </button>
          </div>
        )}

        {/* Movements list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner" /></div>
        ) : movements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '14px' }}>Nenhum lançamento manual para esta data.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              📋 Lançamentos Manuais
            </div>
            {movements.map(m => (
              <div key={m.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: m.type === 'entrada' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.type === 'entrada' ?
                    <ArrowDownCircle size={18} color="#10b981" /> :
                    <ArrowUpCircle size={18} color="#ef4444" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{m.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.category}</div>
                </div>
                <div style={{
                  fontWeight: '800', fontSize: '14px',
                  color: m.type === 'entrada' ? '#10b981' : '#ef4444',
                }}>
                  {m.type === 'entrada' ? '+' : '-'} R$ {Number(m.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
