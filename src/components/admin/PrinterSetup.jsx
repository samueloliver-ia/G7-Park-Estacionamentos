import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer, Bluetooth, Wifi, Save, CheckCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrinterSetup({ onBack }) {
  const { currentUser, printerConfig, setPrinterConfig } = useApp();
  const [form, setForm] = useState({
    printer_name: '', connection_type: 'bluetooth', printer_address: '',
    paper_width: 80, is_default: true,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (printerConfig) setForm({ ...printerConfig });
  }, [printerConfig]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (printerConfig?.id) {
        const { data } = await supabase.from('printer_config').update({ ...form, paper_width: Number(form.paper_width) }).eq('id', printerConfig.id).select().single();
        setPrinterConfig(data);
      } else {
        const { data } = await supabase.from('printer_config').insert([{ parking_id: currentUser.parkingId, ...form, paper_width: Number(form.paper_width) }]).select().single();
        setPrinterConfig(data);
      }
      toast.success('Configurações salvas!');
    } catch { toast.error('Erro ao salvar!'); } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    toast('Função de teste disponível com impressora física conectada.', { icon: '🖨️' });
    setTimeout(() => setTesting(false), 2000);
  };

  const PAPER_WIDTHS = [58, 72, 80];

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Printer size={20} color="#06b6d4" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Impressora Térmica</h1>
      </div>
      <div className="page-content">
        {/* Status */}
        <div style={{
          padding: '16px 20px', borderRadius: '14px', marginBottom: '20px',
          background: printerConfig ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${printerConfig ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          {printerConfig ? <CheckCircle size={20} color="#10b981" /> : <Settings size={20} color="#ef4444" />}
          <div>
            <div style={{ fontWeight: '700', color: printerConfig ? '#10b981' : '#ef4444' }}>
              {printerConfig ? 'Impressora Configurada' : 'Nenhuma Impressora Configurada'}
            </div>
            {printerConfig && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{printerConfig.printer_name} · {printerConfig.connection_type.toUpperCase()}</div>}
          </div>
        </div>

        {/* Form */}
        <div className="card mb-4">
          <div className="section-title"><Printer size={18} color="#06b6d4" /> Configurações</div>

          <div className="form-group">
            <label className="form-label">Nome da Impressora</label>
            <input className="form-input" value={form.printer_name} onChange={e => set('printer_name', e.target.value)} placeholder="Ex: G7 Park Impressora" />
          </div>

          {/* Connection type */}
          <div className="form-group">
            <label className="form-label">Tipo de Conexão</label>
            <div className="flex gap-3">
              <button
                onClick={() => set('connection_type', 'bluetooth')}
                style={{
                  flex: 1, padding: '16px', borderRadius: '14px', border: `2px solid ${form.connection_type === 'bluetooth' ? '#06b6d4' : 'var(--border)'}`,
                  background: form.connection_type === 'bluetooth' ? 'rgba(6,182,212,0.1)' : 'var(--bg-input)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  color: form.connection_type === 'bluetooth' ? '#06b6d4' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <Bluetooth size={28} />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Bluetooth</span>
              </button>
              <button
                onClick={() => set('connection_type', 'wifi')}
                style={{
                  flex: 1, padding: '16px', borderRadius: '14px', border: `2px solid ${form.connection_type === 'wifi' ? '#06b6d4' : 'var(--border)'}`,
                  background: form.connection_type === 'wifi' ? 'rgba(6,182,212,0.1)' : 'var(--bg-input)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  color: form.connection_type === 'wifi' ? '#06b6d4' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <Wifi size={28} />
                <span style={{ fontWeight: '700', fontSize: '13px' }}>Wi-Fi</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {form.connection_type === 'bluetooth' ? 'Endereço Bluetooth (MAC)' : 'IP da Impressora'}
            </label>
            <input className="form-input"
              value={form.printer_address}
              onChange={e => set('printer_address', e.target.value)}
              placeholder={form.connection_type === 'bluetooth' ? 'AA:BB:CC:DD:EE:FF' : '192.168.1.100'}
            />
          </div>

          {/* Paper width */}
          <div className="form-group">
            <label className="form-label">Largura da Bobina</label>
            <div className="flex gap-3">
              {PAPER_WIDTHS.map(w => (
                <button
                  key={w}
                  onClick={() => set('paper_width', w)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: `2px solid ${form.paper_width === w ? '#06b6d4' : 'var(--border)'}`,
                    background: form.paper_width === w ? 'rgba(6,182,212,0.1)' : 'var(--bg-input)',
                    color: form.paper_width === w ? '#06b6d4' : 'var(--text-secondary)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '15px', transition: 'all 0.2s',
                  }}
                >
                  {w}mm
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: '22px', height: '22px' }} /> : <><Save size={18} /> Salvar Config</>}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={handleTest} disabled={testing}>
            <Printer size={18} /> Teste
          </button>
        </div>

        {/* Instructions */}
        <div className="alert alert-info mt-4">
          <span>ℹ️</span>
          <div>
            <strong>Como conectar:</strong>
            <br />• <strong>Bluetooth:</strong> Emparelhe a impressora no celular primeiro, depois informe o MAC address.
            <br />• <strong>Wi-Fi:</strong> Conecte a impressora na mesma rede Wi-Fi e informe o IP.
          </div>
        </div>
      </div>
    </div>
  );
}
