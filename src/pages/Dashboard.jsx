import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, ROLE_LABELS } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { LogOut, Printer, LogIn, LogOut as LogOutIcon, ParkingSquare, Wrench, Car, Bike, Truck, AlertTriangle, Wallet, UserPlus, Shield } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';

export default function Dashboard() {
  const { parkingConfig, currentUser, logout, can } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeVehicles: 0, todayRevenue: 0, categories: { pequeno: 0, medio: 0, grande: 0 } });
  const [lateCount, setLateCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      const [{ data: active }, { data: exited }, { data: latePayments }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('parking_id', currentUser.parkingId).eq('status', 'ativo'),
        supabase.from('vehicles').select('amount_charged').eq('parking_id', currentUser.parkingId).eq('status', 'saiu')
          .gte('exit_time', startOfDay(today).toISOString()).lte('exit_time', endOfDay(today).toISOString()),
        supabase.from('monthly_payments').select('id').eq('parking_id', currentUser.parkingId).in('status', ['atrasado', 'pendente'])
          .lt('due_date', today.toISOString().split('T')[0]),
      ]);

      const vehicles = active || [];
      const categories = { pequeno: 0, medio: 0, grande: 0 };
      vehicles.forEach(v => { if (categories[v.category] !== undefined) categories[v.category]++; });

      const todayRevenue = (exited || []).reduce((s, v) => s + Number(v.amount_charged || 0), 0);

      setStats({ activeVehicles: vehicles.length, todayRevenue, categories });
      setLateCount((latePayments || []).length);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // ── Botões filtrados por permissão ──────────────────────────────────────
  const allButtons = [
    {
      id: 'entry',
      permission: 'entry',
      label: 'ENTRADA',
      icon: <LogIn size={32} color="#fff" strokeWidth={2} style={{ marginBottom: '6px' }} />,
      bg: '#1B2E6B',
      action: () => navigate('/entry'),
    },
    {
      id: 'exit',
      permission: 'exit',
      label: 'SAÍDA',
      icon: <LogOutIcon size={32} color="#fff" strokeWidth={2} style={{ marginBottom: '6px' }} />,
      bg: '#1B2E6B',
      action: () => navigate('/exit'),
    },
    {
      id: 'yard',
      permission: 'yard',
      label: 'PÁTIO',
      icon: <ParkingSquare size={32} color="#fff" strokeWidth={2} style={{ marginBottom: '6px' }} />,
      bg: '#1B2E6B',
      action: () => navigate('/yard'),
    },
    {
      id: 'admin',
      permission: 'admin',
      label: 'ADMIN',
      icon: <Wrench size={32} color="#fff" strokeWidth={2} style={{ marginBottom: '6px' }} />,
      bg: '#152454',
      action: () => navigate('/admin'),
    },
    {
      id: 'customers',
      permission: 'customers',
      label: 'CLIENTES',
      icon: <UserPlus size={32} color="#fff" strokeWidth={2} style={{ marginBottom: '6px' }} />,
      bg: '#3b2f7a',
      action: () => navigate('/admin', { state: { section: 'customers', fromDashboard: true } }),
    },
    {
      id: 'cash',
      permission: 'cash',
      label: 'CAIXA',
      icon: <Wallet size={32} color="#fff" strokeWidth={2} style={{ marginBottom: '6px' }} />,
      bg: '#0e4a3a',
      action: () => navigate('/admin', { state: { section: 'cash', fromDashboard: true } }),
    },
  ];

  const visibleButtons = allButtons.filter(btn => can(btn.permission));
  const isEmployee = currentUser?.isEmployee;
  const roleBadge = ROLE_LABELS[currentUser?.role] || null;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins, sans-serif' }}>

      {/* ── 1. App Bar ── */}
      <div style={{
        background: '#1B2E6B',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#fff'
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          {parkingConfig?.parking_name || 'G7 Park'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {can('admin') && (
            <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Printer size={22} />
            </button>
          )}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* ── 2. User Bar ── */}
      <div style={{
        background: '#f0f2f8',
        padding: '6px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <span style={{ color: '#1B2E6B', fontSize: '13px', fontWeight: '500' }}>
          {currentUser?.name || parkingConfig?.owner_name || 'Administrador'}
        </span>
        {isEmployee && roleBadge && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
            background: '#1B2E6B18', color: '#1B2E6B',
          }}>
            <Shield size={10} />
            {roleBadge}
          </span>
        )}
      </div>

      {/* ── 3. Stats Bar ── */}
      <div style={{
        background: '#152454',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#fff'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>FATURAMENTO HOJE</div>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px', marginRight: '2px' }}>R$</span>
            {stats.todayRevenue.toFixed(2)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Car size={16} color="#94a3b8" /> <span style={{ fontSize: '14px', fontWeight: '600' }}>{stats.categories.pequeno}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Truck size={16} color="#94a3b8" /> <span style={{ fontSize: '14px', fontWeight: '600' }}>{stats.categories.medio}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bike size={16} color="#94a3b8" /> <span style={{ fontSize: '14px', fontWeight: '600' }}>{stats.categories.grande}</span>
          </div>
        </div>
      </div>

      {/* ── Alert: Mensalidades atrasadas (só para admin) ── */}
      {lateCount > 0 && can('admin') && (
        <button onClick={() => navigate('/admin')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px', background: 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid rgba(239,68,68,0.15)',
            border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
          }}>
          <AlertTriangle size={18} color="#ef4444" />
          <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', flex: 1 }}>
            {lateCount} mensalidade{lateCount > 1 ? 's' : ''} em atraso
          </span>
          <span style={{ color: '#ef4444', fontSize: '12px' }}>Ver →</span>
        </button>
      )}

      {/* ── Pátio count ── */}
      <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
          PÁTIO: {stats.activeVehicles} veículo{stats.activeVehicles !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '500' }}>
          {format(new Date(), 'dd/MM/yyyy')}
        </span>
      </div>

      {/* ── Conteúdo Central ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 24px' }}>

        {/* Logo Central */}
        <div style={{
          width: '80px', height: '80px', background: '#1B2E6B',
          borderRadius: '24px 24px 24px 4px', transform: 'rotate(-45deg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '10px 0 30px',
          boxShadow: '0 12px 24px rgba(27,46,107,0.2)',
        }}>
          <div style={{ transform: 'rotate(45deg)', background: '#fff', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#1B2E6B', fontSize: '26px', fontWeight: '800', fontFamily: 'Outfit, sans-serif', letterSpacing: '-2px' }}>G7</span>
          </div>
        </div>

        {/* ── Grid de Botões (filtrado por permissão) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: visibleButtons.length <= 3 ? `repeat(${visibleButtons.length}, 1fr)` : '1fr 1fr 1fr',
          gap: '12px',
          width: '100%', maxWidth: '420px', marginBottom: '20px'
        }}>
          {visibleButtons.map(btn => (
            <button key={btn.id} onClick={btn.action} style={{ ...solidBtnStyle, background: btn.bg }}>
              {btn.icon}
              <span style={solidBtnLabel}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const solidBtnStyle = {
  background: '#1B2E6B',
  border: 'none',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px 12px',
  cursor: 'pointer',
  aspectRatio: '1',
  boxShadow: '0 8px 20px rgba(27,46,107,0.15)',
  transition: 'transform 0.15s ease',
};

const solidBtnLabel = {
  color: '#fff',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
};
