import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ParkingSquare, Clock, RefreshCw, Search, Car } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  pequeno: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  medio: { color: '#4a8eff', bg: 'rgba(26,106,245,0.15)' },
  grande: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

export default function Yard() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('parking_id', currentUser.parkingId)
      .eq('status', 'ativo')
      .order('entry_time', { ascending: true });
    setVehicles(data || []);
    setLoading(false);
  };

  const filtered = vehicles.filter(v =>
    v.plate.toLowerCase().includes(search.toLowerCase())
  );

  const getDuration = (entryTime) => {
    const mins = differenceInMinutes(now, new Date(entryTime));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { text: `${h}h ${m}min`, mins, alert: mins > 180 };
  };

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <ParkingSquare size={20} color="#fff" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Pátio</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>
            {vehicles.length} veículo{vehicles.length !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={loadVehicles}><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="page-content">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '44px' }}
            placeholder="Buscar por placa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <ParkingSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              {search ? 'Nenhum veículo encontrado' : 'Pátio vazio no momento'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((v) => {
              const dur = getDuration(v.entry_time);
              const catStyle = CATEGORY_COLORS[v.category] || CATEGORY_COLORS.pequeno;
              return (
                <div key={v.id} style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${dur.alert ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  {/* Category indicator */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: catStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Car size={24} color={catStyle.color} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '2px' }}>{v.plate}</span>
                      <span style={{
                        fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                        borderRadius: '20px', background: catStyle.bg, color: catStyle.color,
                        textTransform: 'capitalize',
                      }}>{v.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {format(new Date(v.entry_time), 'HH:mm')}
                      </span>
                      <span style={{ color: dur.alert ? '#ef4444' : 'var(--text-secondary)', fontWeight: dur.alert ? '700' : '400' }}>
                        ⏱ {dur.text}
                      </span>
                    </div>
                  </div>

                  {/* Control number */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nº</div>
                    <div style={{ fontWeight: '800', color: 'var(--primary-light)' }}>
                      #{String(v.control_number).padStart(4, '0')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
