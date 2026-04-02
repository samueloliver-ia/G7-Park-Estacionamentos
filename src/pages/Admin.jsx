import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BarChart2, History, DollarSign, Receipt, Users, Printer, ChevronRight, UserPlus, Crown, Wallet, AlertTriangle, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Reports from '../components/admin/Reports';
import VehicleHistory from '../components/admin/VehicleHistory';
import Pricing from '../components/admin/Pricing';
import Expenses from '../components/admin/Expenses';
import Employees from '../components/admin/Employees';
import PrinterSetup from '../components/admin/PrinterSetup';
import Customers from '../components/admin/Customers';
import MonthlyPayments from '../components/admin/MonthlyPayments';
import CashControl from '../components/admin/CashControl';
import DebtCollection from '../components/admin/DebtCollection';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'customers',  label: 'Clientes',         icon: UserPlus,      color: '#8b5cf6', desc: 'Cadastro rápido de clientes' },
  { id: 'monthly',    label: 'Mensalidades',      icon: Crown,         color: '#a855f7', desc: 'Controle de mensalistas' },
  { id: 'cash',       label: 'Caixa Diário',      icon: Wallet,        color: '#10b981', desc: 'Entradas, saídas e saldo' },
  { id: 'debts',      label: 'Cobrança',          icon: AlertTriangle, color: '#ef4444', desc: 'Lista de inadimplentes · WhatsApp' },
  { id: 'reports',    label: 'Relatórios',        icon: BarChart2,     color: '#4a8eff', desc: 'Diários e semanais com impressão' },
  { id: 'history',    label: 'Histórico',         icon: History,       color: '#64748b', desc: 'Veículos que passaram pelo pátio' },
  { id: 'pricing',    label: 'Preços e Cobrança', icon: DollarSign,    color: '#f59e0b', desc: 'Configurar tabela de preços', ownerOnly: true },
  { id: 'expenses',   label: 'Despesas',          icon: Receipt,       color: '#f97316', desc: 'Gerenciar despesas do estacionamento', ownerOnly: true },
  { id: 'employees',  label: 'Funcionários',      icon: Users,         color: '#06b6d4', desc: 'Cadastro, acessos e gestão de equipe', ownerOnly: true },
  { id: 'printer',    label: 'Impressora',        icon: Printer,       color: '#6366f1', desc: 'Bluetooth · YQ-8609 · 58mm', ownerOnly: true },
];

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useApp();
  const [activeSection, setActiveSection] = useState(location.state?.section || null);

  const isOwner = currentUser?.isOwner === true;

  useEffect(() => {
    if (location.state?.section) {
      const sec = SECTIONS.find(s => s.id === location.state.section);
      // Bloqueia acesso direto a seções owner-only para não-owners
      if (sec?.ownerOnly && !isOwner) {
        toast.error('Acesso restrito ao proprietário!');
        setActiveSection(null);
      } else {
        setActiveSection(location.state.section);
      }
    }
  }, [location.state]);

  const handleBack = () => {
    if (location.state?.fromDashboard) {
      navigate('/dashboard', { replace: true });
    } else {
      setActiveSection(null);
    }
  };

  const handleSectionClick = (sec) => {
    if (sec.ownerOnly && !isOwner) {
      toast.error('Apenas o proprietário pode acessar esta área!');
      return;
    }
    setActiveSection(sec.id);
  };

  const renderSection = () => {
    // Dupla verificação de segurança ao renderizar
    const sec = SECTIONS.find(s => s.id === activeSection);
    if (sec?.ownerOnly && !isOwner) {
      return null;
    }
    switch (activeSection) {
      case 'customers':  return <Customers onBack={handleBack} />;
      case 'monthly':    return <MonthlyPayments onBack={handleBack} />;
      case 'cash':       return <CashControl onBack={handleBack} />;
      case 'debts':      return <DebtCollection onBack={handleBack} />;
      case 'reports':    return <Reports onBack={handleBack} />;
      case 'history':    return <VehicleHistory onBack={handleBack} />;
      case 'pricing':    return <Pricing onBack={handleBack} />;
      case 'expenses':   return <Expenses onBack={handleBack} />;
      case 'employees':  return <Employees onBack={handleBack} />;
      case 'printer':    return <PrinterSetup onBack={handleBack} />;
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

        {/* Badge de aviso para funcionários admin */}
        {!isOwner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '12px', marginBottom: '14px',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <Lock size={15} color="#ef4444" />
            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
              Algumas seções são exclusivas do proprietário
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SECTIONS.map((sec) => {
            const locked = sec.ownerOnly && !isOwner;
            return (
              <button
                key={sec.id}
                onClick={() => handleSectionClick(sec)}
                style={{
                  background: locked ? 'var(--bg-card)' : 'var(--bg-card)',
                  border: `1px solid ${locked ? 'rgba(100,116,139,0.2)' : 'var(--border)'}`,
                  borderRadius: '16px',
                  padding: '18px 20px',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.2s ease',
                  opacity: locked ? 0.45 : 1,
                }}
                onMouseEnter={e => {
                  if (!locked) {
                    e.currentTarget.style.borderColor = sec.color;
                    e.currentTarget.style.background = `${sec.color}08`;
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={e => {
                  if (!locked) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.transform = '';
                  }
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                  background: `${sec.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <sec.icon size={24} color={locked ? '#64748b' : sec.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px', fontWeight: '700',
                    color: locked ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    {sec.label}
                    {sec.ownerOnly && (
                      <span style={{
                        fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px',
                        background: locked ? 'rgba(100,116,139,0.15)' : 'rgba(239,175,0,0.15)',
                        color: locked ? '#64748b' : '#b45309',
                        letterSpacing: '0.3px',
                      }}>
                        PROPRIETÁRIO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sec.desc}</div>
                </div>
                {locked
                  ? <Lock size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                  : <ChevronRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                }
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
