import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, AlertTriangle, Phone, MessageCircle, Search, Filter, RefreshCw, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DebtCollection({ onBack }) {
  const { currentUser } = useApp();
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadDebtors(); }, []);

  const loadDebtors = async () => {
    setLoading(true);
    try {
      // Buscar pagamentos pendentes e atrasados com dados do cliente
      const { data } = await supabase
        .from('monthly_payments')
        .select('*, customers(name, plate, whatsapp, monthly_fee, due_day)')
        .eq('parking_id', currentUser.parkingId)
        .in('status', ['pendente', 'atrasado'])
        .order('due_date', { ascending: true });

      // Agrupar por cliente e calcular total devido
      const grouped = {};
      (data || []).forEach(p => {
        const cid = p.customer_id;
        if (!grouped[cid]) {
          grouped[cid] = {
            customer: p.customers,
            customer_id: cid,
            payments: [],
            totalOwed: 0,
            oldestDueDate: p.due_date,
          };
        }
        grouped[cid].payments.push(p);
        grouped[cid].totalOwed += Number(p.amount);
        if (p.due_date < grouped[cid].oldestDueDate) {
          grouped[cid].oldestDueDate = p.due_date;
        }
      });

      // Converter para array e adicionar dias de atraso
      const today = new Date();
      const debtorList = Object.values(grouped).map(d => {
        const daysLate = differenceInDays(today, new Date(d.oldestDueDate + 'T12:00'));
        return { ...d, daysLate: Math.max(0, daysLate), monthsOwed: d.payments.length };
      }).sort((a, b) => b.daysLate - a.daysLate);

      setDebtors(debtorList);
    } catch (err) {
      toast.error('Erro ao carregar inadimplentes!');
    }
    setLoading(false);
  };

  const openWhatsApp = (customer, debtor) => {
    if (!customer?.whatsapp) {
      toast.error('Cliente não tem WhatsApp cadastrado!');
      return;
    }
    const phone = '55' + customer.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá ${customer.name}! 👋\n\n` +
      `Informamos que sua mensalidade do estacionamento está pendente.\n\n` +
      `📋 *Detalhes:*\n` +
      `• Meses pendentes: ${debtor.monthsOwed}\n` +
      `• Valor total: R$ ${debtor.totalOwed.toFixed(2)}\n` +
      `• Placa: ${customer.plate}\n\n` +
      `Por favor, entre em contato para regularizar. Obrigado! 🙏\n\n` +
      `— G7 Park Estacionamentos`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const filtered = debtors.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.customer?.name?.toLowerCase().includes(s) ||
           d.customer?.plate?.toLowerCase().includes(s);
  });

  const totalDebt = debtors.reduce((s, d) => s + d.totalOwed, 0);

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <AlertTriangle size={20} color="#ef4444" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Cobrança</h1>
        <button onClick={loadDebtors} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="page-content">
        {/* Summary */}
        <div className="grid-2 mb-4">
          <div className="stat-card" style={{ textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444' }}>INADIMPLENTES</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444' }}>{debtors.length}</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center', borderColor: 'rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b' }}>TOTAL DEVIDO</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>R$ {totalDebt.toFixed(2)}</div>
          </div>
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <p style={{ fontWeight: '600' }}>Nenhum inadimplente!</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Todos os pagamentos estão em dia.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(d => {
              const urgencyColor = d.daysLate > 30 ? '#ef4444' : d.daysLate > 15 ? '#f59e0b' : '#eab308';
              return (
                <div key={d.customer_id} style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${d.daysLate > 30 ? 'rgba(239,68,68,0.3)' : d.daysLate > 15 ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden',
                }}>
                  {/* Urgency stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: urgencyColor }} />

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: `${urgencyColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Crown size={22} color={urgencyColor} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{d.customer?.name || 'Cliente'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', letterSpacing: '1px' }}>{d.customer?.plate}</span>
                        <span>·</span>
                        <span style={{ color: urgencyColor, fontWeight: '700' }}>{d.daysLate} dias</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '18px', color: urgencyColor }}>
                        R$ {d.totalOwed.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {d.monthsOwed} mês(es)
                      </div>
                    </div>
                  </div>

                  {/* Months detail */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {d.payments.map(p => (
                      <span key={p.id} style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '600',
                        background: p.status === 'atrasado' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                        color: p.status === 'atrasado' ? '#ef4444' : '#f59e0b',
                        textTransform: 'capitalize',
                      }}>
                        {format(parse(p.reference_month, 'yyyy-MM', new Date()), 'MMM/yy', { locale: ptBR })}
                      </span>
                    ))}
                  </div>

                  {/* WhatsApp button */}
                  <button
                    onClick={() => openWhatsApp(d.customer, d)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                      background: '#25d366', color: '#fff', fontSize: '14px', fontWeight: '700',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#20bd5a'}
                    onMouseLeave={e => e.currentTarget.style.background = '#25d366'}
                  >
                    <MessageCircle size={18} />
                    Cobrar via WhatsApp
                    {d.customer?.whatsapp && (
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>
                        ({d.customer.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')})
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
