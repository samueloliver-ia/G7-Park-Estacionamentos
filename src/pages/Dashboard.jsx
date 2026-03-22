import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LogOut, Printer, MoreVertical, LogIn, LogOut as LogOutIcon, ParkingSquare, Wrench, Car, Bike, Truck } from 'lucide-react';

export default function Dashboard() {
  const { parkingConfig, currentUser, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins, sans-serif' }}>
      
      {/* ── 1. App Bar (Header) ── */}
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
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <Printer size={22} />
          </button>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      {/* ── 2. User Bar ── */}
      <div style={{
        background: '#f0f2f8',
        padding: '6px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <span style={{ color: '#1B2E6B', fontSize: '13px', fontWeight: '500' }}>
          {currentUser?.name || parkingConfig?.owner_name || 'Administrador'}
        </span>
      </div>

      {/* ── 3. Stats Bar ── */}
      <div style={{
        background: '#152454', /* Um azul levemente mais escuro para contraste */
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#fff'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600' }}>
          <span style={{ color: '#94a3b8', marginRight: '4px', fontSize: '12px' }}>R$</span>
          0,00
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Car size={16} color="#94a3b8" /> <span style={{ fontSize: '13px', fontWeight: '500' }}>0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={16} color="#94a3b8" /> <span style={{ fontSize: '13px', fontWeight: '500' }}>0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bike size={16} color="#94a3b8" /> <span style={{ fontSize: '13px', fontWeight: '500' }}>0</span>
          </div>
        </div>
      </div>

      {/* ── Info Texto Lateral ── */}
      <div style={{ padding: '6px 16px', textAlign: 'right', color: '#64748b', fontSize: '11px', fontWeight: '500' }}>
        15 dia(s)
      </div>

      {/* ── Conteúdo Central ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 24px' }}>
        
        {/* Logo Central (Pin Drop) */}
        <div style={{
          width: '90px',
          height: '90px',
          background: '#1B2E6B',
          borderRadius: '24px 24px 24px 4px',
          transform: 'rotate(-45deg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '10px 0 40px',
          boxShadow: '0 12px 24px rgba(27,46,107,0.2)',
        }}>
          <div style={{ transform: 'rotate(45deg)', background: '#fff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#1B2E6B', fontSize: '32px', fontWeight: '800', fontFamily: 'Outfit, sans-serif', letterSpacing: '-2px' }}>G7</span>
          </div>
        </div>

        {/* ── Grid 2x2 Botões Sólidos ── */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', 
          width: '100%', maxWidth: '380px', marginBottom: '40px'
        }}>
          
          <button onClick={() => navigate('/entry')} style={solidBtnStyle}>
            <LogIn size={40} color="#fff" strokeWidth={2} style={{ marginBottom: '8px' }} />
            <span style={solidBtnLabel}>ENTRADA</span>
          </button>

          <button onClick={() => navigate('/exit')} style={solidBtnStyle}>
            <LogOutIcon size={40} color="#fff" strokeWidth={2} style={{ marginBottom: '8px' }} />
            <span style={solidBtnLabel}>SAÍDA</span>
          </button>

          <button onClick={() => navigate('/yard')} style={solidBtnStyle}>
            <ParkingSquare size={40} color="#fff" strokeWidth={2} style={{ marginBottom: '8px' }} />
            <span style={solidBtnLabel}>PÁTIO</span>
          </button>

          <button onClick={() => navigate('/admin')} style={solidBtnStyle}>
            <Wrench size={40} color="#fff" strokeWidth={2} style={{ marginBottom: '8px' }} />
            <span style={solidBtnLabel}>ADMIN</span>
          </button>

        </div>

        {/* ── Warning Impressora ── */}
        <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
            Impressora Bluetooth não configurada
          </p>
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
  padding: '24px 16px',
  cursor: 'pointer',
  aspectRatio: '1',
  boxShadow: '0 8px 20px rgba(27,46,107,0.15)',
  transition: 'transform 0.15s ease',
};

const solidBtnLabel = {
  color: '#fff',
  fontSize: '14px',
  fontWeight: '700',
  letterSpacing: '0.5px',
};
