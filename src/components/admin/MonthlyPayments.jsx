import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Calendar, DollarSign, Check, Plus, AlertTriangle, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addMonths, parse, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MonthlyPayments({ onBack }) {
  const { currentUser } = useApp();
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  useEffect(() => { loadData(); }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: custs }, { data: pays }] = await Promise.all([
      supabase.from('customers').select('*').eq('parking_id', currentUser.parkingId).eq('customer_type', 'mensal').eq('status', 'ativo').order('name'),
      supabase.from('monthly_payments').select('*, customers(name, plate, whatsapp)').eq('parking_id', currentUser.parkingId).eq('reference_month', selectedMonth).order('due_date'),
    ]);
    setCustomers(custs || []);
    setPayments(pays || []);
    setLoading(false);
  };

  const generatePayments = async () => {
    setGenerating(true);
    try {
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = parseInt(selectedMonth.split('-')[1]);
      const existingCustomerIds = payments.map(p => p.customer_id);
      const toGenerate = customers.filter(c => !existingCustomerIds.includes(c.id));

      if (toGenerate.length === 0) {
        toast('Todas as cobranças já foram geradas para este mês.', { icon: 'ℹ️' });
        setGenerating(false);
        return;
      }

      const records = toGenerate.map(c => ({
        parking_id: currentUser.parkingId,
        customer_id: c.id,
        reference_month: selectedMonth,
        amount: c.monthly_fee,
        due_date: `${year}-${String(month).padStart(2, '0')}-${String(c.due_day).padStart(2, '0')}`,
        status: 'pendente',
      }));

      await supabase.from('monthly_payments').insert(records);
      toast.success(`${toGenerate.length} cobrança(s) gerada(s)!`);
      loadData();
    } catch (err) {
      toast.error('Erro ao gerar cobranças!');
    } finally { setGenerating(false); }
  };

  const markAsPaid = async (payment, method = 'dinheiro') => {
    try {
      await supabase.from('monthly_payments').update({
        status: 'pago',
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: method,
      }).eq('id', payment.id);

      // Registrar no caixa
      await supabase.from('cash_movements').insert([{
        parking_id: currentUser.parkingId,
        type: 'entrada',
        category: 'mensalidade',
        description: `Mensalidade ${payment.customers?.name || ''} - ${format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMM/yyyy', { locale: ptBR })}`,
        amount: payment.amount,
        payment_method: method,
        reference_id: payment.id,
        reference_type: 'monthly_payment',
        movement_date: new Date().toISOString().split('T')[0],
      }]);

      toast.success('Pagamento registrado!');
      loadData();
    } catch { toast.error('Erro ao registrar pagamento!'); }
  };

  const markAsLate = async () => {
    const today = startOfDay(new Date());
    const pendentPayments = payments.filter(p => {
      return p.status === 'pendente' && isBefore(new Date(p.due_date + 'T12:00'), today);
    });

    if (pendentPayments.length === 0) {
      toast('Nenhum pagamento em atraso encontrado.', { icon: 'ℹ️' });
      return;
    }

    const ids = pendentPayments.map(p => p.id);
    await supabase.from('monthly_payments').update({ status: 'atrasado' }).in('id', ids);
    toast.success(`${pendentPayments.length} pagamento(s) marcado(s) como atrasado.`);
    loadData();
  };

  const paidCount = payments.filter(p => p.status === 'pago').length;
  const pendingCount = payments.filter(p => p.status === 'pendente').length;
  const lateCount = payments.filter(p => p.status === 'atrasado').length;
  const totalReceived = payments.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status !== 'pago').reduce((s, p) => s + Number(p.amount), 0);

  const months = [];
  for (let i = -2; i <= 2; i++) {
    const d = addMonths(new Date(), i);
    months.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMM/yyyy', { locale: ptBR }) });
  }

  const PAYMENT_METHODS = [
    { id: 'dinheiro', label: '💵 Dinheiro' },
    { id: 'pix', label: '📱 PIX' },
    { id: 'cartao_debito', label: '💳 Débito' },
    { id: 'cartao_credito', label: '💳 Crédito' },
  ];

  const statusColors = {
    pago: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'PAGO' },
    pendente: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'PENDENTE' },
    atrasado: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'ATRASADO' },
  };

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Crown size={20} color="#8b5cf6" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Mensalidades</h1>
      </div>

      <div className="page-content">
        {/* Month selector */}
        <div className="tabs" style={{ marginBottom: '16px' }}>
          {months.map(m => (
            <button key={m.value} className={`tab ${selectedMonth === m.value ? 'active' : ''}`}
              onClick={() => setSelectedMonth(m.value)} style={{ textTransform: 'capitalize', fontSize: '12px', padding: '8px 4px' }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div className="stat-card" style={{ textAlign: 'center', padding: '10px', borderColor: 'rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{paidCount}</div>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '600' }}>PAGOS</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center', padding: '10px', borderColor: 'rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{pendingCount}</div>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>PENDENTES</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center', padding: '10px', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{lateCount}</div>
            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>ATRASADOS</div>
          </div>
        </div>

        {/* Revenue summary */}
        <div className="grid-2 mb-4">
          <div className="stat-card" style={{ textAlign: 'center', borderColor: 'rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>RECEBIDO</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>R$ {totalReceived.toFixed(2)}</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>A RECEBER</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>R$ {totalPending.toFixed(2)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button className="btn btn-primary btn-full" onClick={generatePayments} disabled={generating}>
            {generating ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : <><Plus size={16} /> Gerar Cobranças</>}
          </button>
          <button className="btn btn-ghost" onClick={markAsLate} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={16} /> Atualizar Atrasos
          </button>
        </div>

        {/* Payments List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner" /></div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p>Nenhuma cobrança para este mês.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Clique em "Gerar Cobranças" para criar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {payments.map(p => {
              const st = statusColors[p.status] || statusColors.pendente;
              const isExpanded = expandedCustomer === p.id;
              return (
                <div key={p.id} style={{
                  background: 'var(--bg-card)', border: `1px solid ${p.status === 'atrasado' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  borderRadius: '14px', overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    onClick={() => setExpandedCustomer(isExpanded ? null : p.id)}>
                    {/* Status icon */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.status === 'pago' ? <Check size={20} color={st.color} /> :
                       p.status === 'atrasado' ? <AlertTriangle size={20} color={st.color} /> :
                       <Calendar size={20} color={st.color} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{p.customers?.name || 'Cliente'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {p.customers?.plate || ''} · Venc: {format(new Date(p.due_date + 'T12:00'), 'dd/MM')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: '800', color: st.color }}>R$ {Number(p.amount).toFixed(2)}</div>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Expanded: Payment actions */}
                  {isExpanded && p.status !== 'pago' && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', margin: '12px 0 8px' }}>
                        Registrar Pagamento:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {PAYMENT_METHODS.map(pm => (
                          <button key={pm.id} className="btn btn-ghost btn-sm" onClick={() => markAsPaid(p, pm.id)}
                            style={{ justifyContent: 'flex-start', fontSize: '13px' }}>
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {isExpanded && p.status === 'pago' && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '12px', color: '#10b981', padding: '8px 0' }}>
                        ✅ Pago em {p.paid_date ? format(new Date(p.paid_date + 'T12:00'), 'dd/MM/yyyy') : '—'}
                        {p.payment_method && ` · ${p.payment_method}`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
