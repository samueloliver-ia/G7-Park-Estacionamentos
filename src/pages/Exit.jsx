import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, ScanLine, Printer, DollarSign, Clock, Car, CheckCircle, CreditCard, Banknote, Smartphone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { differenceInMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAYMENT_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'PIX', icon: Smartphone },
  { id: 'cartao_debito', label: 'Débito', icon: CreditCard },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
];

export default function Exit() {
  const { currentUser, pricingConfig } = useApp();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [manualId, setManualId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [loading, setLoading] = useState(false);
  const [receiptDone, setReceiptDone] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);

  const startScanner = async () => {
    setScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerInstance.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => { handleQRDecoded(decoded); scanner.stop(); setScanning(false); },
          () => {}
        );
      } catch (e) {
        toast.error('Câmera não disponível!');
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerInstance.current) {
      scannerInstance.current.stop().catch(() => {});
      scannerInstance.current = null;
    }
    setScanning(false);
  };

  const handleQRDecoded = async (decoded) => {
    try {
      const data = JSON.parse(decoded);
      await fetchVehicle(data.id);
    } catch {
      toast.error('QR Code inválido!');
    }
  };

  const fetchVehicle = async (id) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .eq('status', 'ativo')
      .single();
    if (error || !data) { toast.error('Veículo não encontrado ou já saiu!'); return; }
    setVehicle(data);
  };

  const fetchByPlate = async () => {
    if (!manualId) return;
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('parking_id', currentUser.parkingId)
      .ilike('plate', manualId.replace('-', ''))
      .eq('status', 'ativo')
      .order('entry_time', { ascending: false })
      .limit(1)
      .single();
    if (data) setVehicle(data);
    else toast.error('Veículo não encontrado no pátio!');
  };

  const calculateAmount = (v) => {
    if (!v) return 0;
    const mins = differenceInMinutes(new Date(), new Date(v.entry_time));
    const pricing = pricingConfig.find(p => p.category === v.category);
    if (!pricing) return 0;

    if (pricing.charge_type === 'diaria') return pricing.price_daily || 0;

    const graceMinutes = pricing.grace_period_minutes || 0;
    if (mins <= graceMinutes) return 0;

    const hours = Math.ceil(mins / 60);
    if (hours <= 1) return pricing.price_first_hour || pricing.price_per_hour || 0;
    return (pricing.price_first_hour || pricing.price_per_hour || 0) + (hours - 1) * (pricing.price_additional_hour || pricing.price_per_hour || 0);
  };

  const handleExit = async () => {
    if (!vehicle) return;
    setLoading(true);
    const amount = calculateAmount(vehicle);
    const exitTime = new Date().toISOString();
    const mins = differenceInMinutes(new Date(), new Date(vehicle.entry_time));
    try {
      await supabase.from('vehicles').update({
        exit_time: exitTime,
        duration_minutes: mins,
        amount_charged: amount,
        payment_method: paymentMethod,
        status: 'saiu',
      }).eq('id', vehicle.id);
      toast.success('Saída registrada!');
      if (printReceipt) window.print();
      setReceiptDone(true);
    } catch {
      toast.error('Erro ao registrar saída!');
    } finally {
      setLoading(false);
    }
  };

  const amount = calculateAmount(vehicle);
  const durationMins = vehicle ? differenceInMinutes(new Date(), new Date(vehicle.entry_time)) : 0;

  if (receiptDone) {
    return (
      <div className="page-wrapper">
        <div className="bg-animated" />
        <div className="page-header">
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Saída Concluída</h1>
        </div>
        <div className="page-content" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={48} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: '#10b981' }}>Saída Registrada!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Placa: <strong style={{ color: 'var(--text-primary)' }}>{vehicle?.plate}</strong></p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Valor cobrado: <strong style={{ color: '#f59e0b', fontSize: '22px' }}>R$ {amount.toFixed(2)}</strong></p>
          <div className="flex gap-3" style={{ maxWidth: '340px', margin: '0 auto' }}>
            <button className="btn btn-primary btn-full" onClick={() => { setVehicle(null); setReceiptDone(false); }}>Nova Saída</button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/dashboard')}>Início</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Car size={20} color="#fff" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Registrar Saída</h1>
      </div>
      <div className="page-content">
        {!vehicle ? (
          <>
            {/* QR Scanner */}
            {!scanning ? (
              <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
                <div className="section-title" style={{ justifyContent: 'center' }}><ScanLine size={18} color="#4a8eff" /> Ler QR Code</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Escaneie o recibo de entrada do cliente</p>
                <button className="btn btn-primary" onClick={startScanner}>
                  <ScanLine size={18} /> Abrir Câmera / Escanear
                </button>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="flex justify-between items-center mb-4">
                  <span style={{ fontWeight: '700' }}>Posicione o QR Code</span>
                  <button className="btn btn-ghost btn-sm" onClick={stopScanner}><X size={16} /></button>
                </div>
                <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
              </div>
            )}

            {/* Manual search */}
            <div className="card">
              <div className="section-title">Busca Manual</div>
              <div className="flex gap-2">
                <input
                  className="form-input"
                  placeholder="Digite a Placa (ABC-1234)"
                  style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
                  value={manualId}
                  onChange={e => setManualId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && fetchByPlate()}
                />
                <button className="btn btn-primary" onClick={fetchByPlate}>Buscar</button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Vehicle info */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="flex justify-between items-center mb-16">
                <div className="section-title" style={{ margin: 0 }}><Car size={18} color="#4a8eff" /> Veículo</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setVehicle(null)}><X size={16} /> Trocar</button>
              </div>
              <div className="grid-2">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '3px' }}>{vehicle.plate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>{vehicle.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrada</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{format(new Date(vehicle.entry_time), 'dd/MM HH:mm')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permanência</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>
                    {Math.floor(durationMins / 60)}h {durationMins % 60}min
                  </div>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="card" style={{ marginBottom: '16px', textAlign: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Valor a Receber</p>
              <div style={{ fontSize: '44px', fontWeight: '900', color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
                R$ {amount.toFixed(2)}
              </div>
            </div>

            {/* Payment method */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="section-title"><DollarSign size={18} color="#10b981" /> Forma de Pagamento</div>
              <div className="grid-2">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    style={{
                      padding: '14px', borderRadius: '12px', border: `2px solid ${paymentMethod === pm.id ? 'var(--success)' : 'var(--border)'}`,
                      background: paymentMethod === pm.id ? 'var(--success-bg)' : 'var(--bg-input)',
                      color: paymentMethod === pm.id ? 'var(--success)' : 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.2s',
                    }}
                  >
                    <pm.icon size={16} /> {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <input type="checkbox" id="printR" checked={printReceipt} onChange={e => setPrintReceipt(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="printR" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Printer size={16} /> Imprimir recibo do cliente
              </label>
            </div>

            <button className="btn btn-danger btn-full btn-lg" onClick={handleExit} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: '22px', height: '22px' }} /> : (
                <><CheckCircle size={20} /> Confirmar Saída — R$ {amount.toFixed(2)}</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
