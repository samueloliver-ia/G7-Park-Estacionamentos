import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, BarChart2, Printer, TrendingUp, DollarSign, Car, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports({ onBack }) {
  const { currentUser, parkingConfig } = useApp();
  const [period, setPeriod] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState({ vehicles: [], revenue: 0, count: 0, avgDuration: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadReport(); }, [period]);

  const getDateRange = () => {
    const now = new Date();
    if (period === 'today') return { start: startOfDay(now), end: endOfDay(now) };
    if (period === 'yesterday') return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    if (period === 'week') return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
    if (period === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
    }
    return { start: startOfDay(now), end: endOfDay(now) };
  };

  const loadReport = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('parking_id', currentUser.parkingId)
      .eq('status', 'saiu')
      .gte('exit_time', start.toISOString())
      .lte('exit_time', end.toISOString())
      .order('exit_time', { ascending: false });

    const v = vehicles || [];
    const revenue = v.reduce((s, x) => s + Number(x.amount_charged || 0), 0);
    const avgDuration = v.length ? v.reduce((s, x) => s + (x.duration_minutes || 0), 0) / v.length : 0;
    setData({ vehicles: v, revenue, count: v.length, avgDuration });
    setLoading(false);
  };

  const printReport = () => {
    const { start, end } = getDateRange();
    const win = window.open('', '_blank');
    const catCount = { pequeno: 0, medio: 0, grande: 0 };
    data.vehicles.forEach(v => { if (catCount[v.category] !== undefined) catCount[v.category]++; });

    win.document.write(`
      <html><head><title>Relatório G7 Park</title>
      <style>
        body { font-family: monospace; font-size: 12px; max-width: 320px; margin: 0 auto; }
        h2 { text-align: center; font-size: 16px; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .center { text-align: center; }
      </style></head><body>
      <h2>G7 PARK</h2>
      <p class="center">${parkingConfig?.parking_name || ''}</p>
      <div class="line"></div>
      <p class="center">RELATÓRIO - ${period === 'today' ? 'HOJE' : period === 'week' ? 'SEMANAL' : 'PERÍODO'}</p>
      <p class="center">${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}</p>
      <div class="line"></div>
      <div class="row"><span>Total de Veículos:</span><span>${data.count}</span></div>
      <div class="row"><span>Receita Total:</span><span>R$ ${data.revenue.toFixed(2)}</span></div>
      <div class="row"><span>Tempo Médio:</span><span>${Math.floor(data.avgDuration / 60)}h ${Math.floor(data.avgDuration % 60)}min</span></div>
      <div class="line"></div>
      <div class="row"><span>Pequeno:</span><span>${catCount.pequeno}</span></div>
      <div class="row"><span>Médio:</span><span>${catCount.medio}</span></div>
      <div class="row"><span>Grande:</span><span>${catCount.grande}</span></div>
      <div class="line"></div>
      <p class="center">Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <BarChart2 size={20} color="#4a8eff" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Relatórios</h1>
        <button onClick={printReport} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
          <Printer size={16} /> Imprimir
        </button>
      </div>
      <div className="page-content">
        {/* Period selector */}
        <div className="tabs">
          {[{ id: 'today', l: 'Hoje' }, { id: 'yesterday', l: 'Ontem' }, { id: 'week', l: 'Semana' }, { id: 'custom', l: 'Período' }].map(p => (
            <button key={p.id} className={`tab ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.l}</button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="grid-2 mb-4">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">De</label>
              <input type="date" className="form-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Até</label>
              <input type="date" className="form-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ gridColumn: '1/-1' }} onClick={loadReport}>Filtrar</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <span className="spinner" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid-2 mb-4">
              <div className="stat-card">
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(26,106,245,0.15)', width: 'fit-content' }}><Car size={18} color="#4a8eff" /></div>
                <div className="stat-value">{data.count}</div>
                <div className="stat-label">Veículos</div>
              </div>
              <div className="stat-card">
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', width: 'fit-content' }}><DollarSign size={18} color="#f59e0b" /></div>
                <div className="stat-value" style={{ fontSize: '22px', color: '#f59e0b' }}>R$ {data.revenue.toFixed(2)}</div>
                <div className="stat-label">Receita</div>
              </div>
            </div>

            {/* Table */}
            {data.vehicles.length > 0 ? (
              <div className="card" style={{ padding: '0' }}>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Placa</th>
                        <th>Categoria</th>
                        <th>Duração</th>
                        <th>Valor</th>
                        <th>Pagamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vehicles.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: '700', letterSpacing: '1px' }}>{v.plate}</td>
                          <td style={{ textTransform: 'capitalize' }}>{v.category}</td>
                          <td>{Math.floor((v.duration_minutes || 0) / 60)}h {(v.duration_minutes || 0) % 60}min</td>
                          <td style={{ color: '#f59e0b', fontWeight: '700' }}>R$ {Number(v.amount_charged || 0).toFixed(2)}</td>
                          <td style={{ textTransform: 'capitalize', fontSize: '13px' }}>{v.payment_method?.replace('_', ' ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Nenhum veículo no período selecionado.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
