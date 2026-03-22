import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, History, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function VehicleHistory({ onBack }) {
  const { currentUser } = useApp();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');

  useEffect(() => { loadHistory(); }, [status]);

  const loadHistory = async () => {
    setLoading(true);
    let query = supabase
      .from('vehicles')
      .select('*')
      .eq('parking_id', currentUser.parkingId)
      .order('entry_time', { ascending: false })
      .limit(100);
    if (status !== 'todos') query = query.eq('status', status);
    const { data } = await query;
    setVehicles(data || []);
    setLoading(false);
  };

  const filtered = vehicles.filter(v =>
    v.plate.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_COLORS = {
    ativo: { color: '#10b981', label: 'No Pátio' },
    saiu: { color: '#94a3b8', label: 'Saiu' },
    cancelado: { color: '#ef4444', label: 'Cancelado' },
  };

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <History size={20} color="#8b5cf6" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Histórico</h1>
      </div>
      <div className="page-content">
        <div className="tabs">
          {[{ id: 'todos', l: 'Todos' }, { id: 'ativo', l: 'Pátio' }, { id: 'saiu', l: 'Saíram' }].map(s => (
            <button key={s.id} className={`tab ${status === s.id ? 'active' : ''}`} onClick={() => setStatus(s.id)}>{s.l}</button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: '44px' }} placeholder="Buscar placa..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner" /></div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Placa</th>
                    <th>Categoria</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => {
                    const sc = STATUS_COLORS[v.status] || STATUS_COLORS.saiu;
                    return (
                      <tr key={v.id}>
                        <td style={{ color: 'var(--primary-light)', fontWeight: '700' }}>#{String(v.control_number).padStart(4, '0')}</td>
                        <td style={{ fontWeight: '700', letterSpacing: '1px' }}>{v.plate}</td>
                        <td style={{ textTransform: 'capitalize', fontSize: '13px' }}>{v.category}</td>
                        <td style={{ fontSize: '12px' }}>{format(new Date(v.entry_time), 'dd/MM HH:mm')}</td>
                        <td style={{ fontSize: '12px' }}>{v.exit_time ? format(new Date(v.exit_time), 'dd/MM HH:mm') : '—'}</td>
                        <td style={{ color: '#f59e0b', fontWeight: '600' }}>
                          {v.amount_charged ? `R$ ${Number(v.amount_charged).toFixed(2)}` : '—'}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                            borderRadius: '20px', background: `${sc.color}18`, color: sc.color,
                          }}>{sc.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum resultado encontrado.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
