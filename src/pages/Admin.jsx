import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, History, DollarSign, Receipt, Users, Printer, ChevronRight } from 'lucide-react';
import Reports from '../components/admin/Reports';
import VehicleHistory from '../components/admin/VehicleHistory';
import Pricing from '../components/admin/Pricing';
import Expenses from '../components/admin/Expenses';
import Employees from '../components/admin/Employees';
import PrinterSetup from '../components/admin/PrinterSetup';

const SECTIONS = [
  { id: 'reports', label: 'Relatórios', icon: BarChart2, color: '#4a8eff', desc: 'Diários e semanais com impressão' },
  { id: 'history', label: 'Histórico', icon: History, color: '#8b5cf6', desc: 'Veículos que passaram pelo pátio' },
  { id: 'pricing', label: 'Preços e Cobrança', icon: DollarSign, color: '#f59e0b', desc: 'Configurar tabela de preços' },
  { id: 'expenses', label: 'Despesas', icon: Receipt, color: '#ef4444', desc: 'Gerenciar despesas do estacionamento' },
  { id: 'employees', label: 'Funcionários', icon: Users, color: '#10b981', desc: 'Cadastro e gestão de equipe' },
  { id: 'printer', label: 'Impressora', icon: Printer, color: '#06b6d4', desc: 'Configurar impressora térmica' },
];

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);

  const renderSection = () => {
    switch (activeSection) {
      case 'reports': return <Reports onBack={() => setActiveSection(null)} />;
      case 'history': return <VehicleHistory onBack={() => setActiveSection(null)} />;
      case 'pricing': return <Pricing onBack={() => setActiveSection(null)} />;
      case 'expenses': return <Expenses onBack={() => setActiveSection(null)} />;
      case 'employees': return <Employees onBack={() => setActiveSection(null)} />;
      case 'printer': return <PrinterSetup onBack={() => setActiveSection(null)} />;
      default: return null;
    }
  };

  if (activeSection) return renderSection();

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <span style={{ fontSize: '22px' }}>⚙️</span>
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Painel Admin</h1>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '18px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = sec.color;
                e.currentTarget.style.background = `${sec.color}08`;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.transform = '';
              }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                background: `${sec.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <sec.icon size={24} color={sec.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{sec.label}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sec.desc}</div>
              </div>
              <ChevronRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
