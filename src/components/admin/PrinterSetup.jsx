import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer, Bluetooth, Wifi, Save, CheckCircle, Settings, Search, Zap, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { printer } from '../../lib/bluetooth-printer';

export default function PrinterSetup({ onBack }) {
  const { currentUser, printerConfig, setPrinterConfig } = useApp();
  const [form, setForm] = useState({
    printer_name: '', connection_type: 'bluetooth', printer_address: '',
    paper_width: 58, is_default: true,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [btConnected, setBtConnected] = useState(printer.connected);
  const [btSupported, setBtSupported] = useState(true);

  useEffect(() => {
    if (printerConfig) setForm({ ...printerConfig });
    setBtSupported(!!navigator.bluetooth);
    setBtConnected(printer.connected);
  }, [printerConfig]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await printer.connect();
      setBtConnected(true);
      set('printer_name', result.name);
      toast.success(`Conectado: ${result.name}`);
    } catch (err) {
      toast.error(err.message || 'Erro ao conectar!');
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    await printer.disconnect();
    setBtConnected(false);
    toast.success('Impressora desconectada.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, paper_width: Number(form.paper_width) };
      if (printerConfig?.id) {
        const { data } = await supabase.from('printer_config').update(payload).eq('id', printerConfig.id).select().single();
        setPrinterConfig(data);
      } else {
        const { data } = await supabase.from('printer_config').insert([{ parking_id: currentUser.parkingId, ...payload }]).select().single();
        setPrinterConfig(data);
      }
      toast.success('Configurações salvas!');
    } catch { toast.error('Erro ao salvar!'); } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    if (printer.connected) {
      try {
        await printer.testPrint();
        toast.success('Página de teste enviada!');
      } catch (err) {
        toast.error('Erro ao imprimir: ' + err.message);
      }
    } else {
      toast.error('Conecte a impressora primeiro!');
    }
    setTesting(false);
  };

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Printer size={20} color="#06b6d4" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Impressora Térmica</h1>
      </div>
      <div className="page-content">
        {/* Status Card */}
        <div style={{
          padding: '20px', borderRadius: '16px', marginBottom: '20px',
          background: btConnected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${btConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: btConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {btConnected ? <CheckCircle size={24} color="#10b981" /> : <AlertCircle size={24} color="#ef4444" />}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: btConnected ? '#10b981' : '#ef4444' }}>
                {btConnected ? 'Impressora Conectada' : 'Desconectada'}
              </div>
              {btConnected && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {printer.deviceName} · Bluetooth
                </div>
              )}
            </div>
          </div>

          {/* Connect/Disconnect */}
          <div className="flex gap-2">
            {btConnected ? (
              <button className="btn btn-ghost btn-full" onClick={handleDisconnect}
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                Desconectar
              </button>
            ) : (
              <button className="btn btn-primary btn-full" onClick={handleConnect} disabled={connecting}
                style={{ background: '#06b6d4' }}>
                {connecting ? (
                  <><span className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Buscando...</>
                ) : (
                  <><Bluetooth size={18} /> Buscar Impressora</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Browser Support Warning */}
        {!btSupported && (
          <div className="alert mb-4" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            <AlertCircle size={20} />
            <div>
              <strong>Web Bluetooth não suportado!</strong>
              <br />Use o Google Chrome ou Microsoft Edge para conectar via Bluetooth.
            </div>
          </div>
        )}

        {/* Printer Model Info */}
        <div className="card mb-4" style={{ padding: '16px' }}>
          <div className="section-title" style={{ marginBottom: '10px' }}>
            <Zap size={18} color="#f59e0b" /> Modelo Configurado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '14px', background: 'var(--bg-input)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
            }}>
              🖨️
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Mini Thermal Print</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>YQ-8609 · 58mm · Bluetooth</div>
              <div style={{ fontSize: '12px', color: '#06b6d4', fontWeight: '600', marginTop: '2px' }}>ESC/POS Compatível</div>
            </div>
          </div>
        </div>

        {/* Config Form */}
        <div className="card mb-4">
          <div className="section-title"><Settings size={18} color="#06b6d4" /> Configurações</div>

          <div className="form-group">
            <label className="form-label">Nome da Impressora</label>
            <input className="form-input" value={form.printer_name} onChange={e => set('printer_name', e.target.value)}
              placeholder="Ex: G7 Park Impressora" />
          </div>

          {/* Paper width - default to 58mm for YQ-8609 */}
          <div className="form-group">
            <label className="form-label">Largura da Bobina</label>
            <div className="flex gap-3">
              {[58, 72, 80].map(w => (
                <button key={w} onClick={() => set('paper_width', w)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: `2px solid ${form.paper_width === w ? '#06b6d4' : 'var(--border)'}`,
                    background: form.paper_width === w ? 'rgba(6,182,212,0.1)' : 'var(--bg-input)',
                    color: form.paper_width === w ? '#06b6d4' : 'var(--text-secondary)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '15px', transition: 'all 0.2s',
                  }}>
                  {w}mm {w === 58 && '⭐'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: '22px', height: '22px' }} /> : <><Save size={18} /> Salvar Config</>}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={handleTest} disabled={testing || !btConnected}
            style={{ opacity: btConnected ? 1 : 0.5 }}>
            <Printer size={18} /> Teste
          </button>
        </div>

        {/* Instructions */}
        <div className="card mt-4" style={{ padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>📖 Como conectar:</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <strong>1.</strong> Ligue a impressora YQ-8609<br />
            <strong>2.</strong> Ative o Bluetooth do celular/computador<br />
            <strong>3.</strong> Clique em <strong>"Buscar Impressora"</strong><br />
            <strong>4.</strong> Selecione o dispositivo na lista<br />
            <strong>5.</strong> Clique em <strong>"Teste"</strong> para verificar<br />
            <strong>6.</strong> Salve as configurações<br /><br />
            <span style={{ color: '#f59e0b' }}>⚠️ Use Chrome ou Edge para Bluetooth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
