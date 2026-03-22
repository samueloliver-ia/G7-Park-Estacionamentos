import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'pequeno', label: '🚗 Pequeno', color: '#10b981' },
  { id: 'medio', label: '🚙 Médio', color: '#4a8eff' },
  { id: 'grande', label: '🚌 Grande', color: '#f59e0b' },
];

const CHARGE_TYPES = [
  { id: 'hora', label: 'Por Hora' },
  { id: 'fracao', label: 'Por Fração' },
  { id: 'diaria', label: 'Diária' },
];

export default function Pricing({ onBack }) {
  const { currentUser, pricingConfig, setPricingConfig } = useApp();
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = {};
    pricingConfig.forEach(pc => {
      p[pc.category] = { ...pc };
    });
    CATEGORIES.forEach(cat => {
      if (!p[cat.id]) {
        p[cat.id] = { category: cat.id, charge_type: 'hora', price_per_hour: 0, price_first_hour: 0, price_additional_hour: 0, price_daily: 0, grace_period_minutes: 0 };
      }
    });
    setPrices(p);
  }, [pricingConfig]);

  const setP = (cat, field, val) => {
    setPrices(prev => ({ ...prev, [cat]: { ...prev[cat], [field]: val } }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const cat of CATEGORIES.map(c => c.id)) {
        const p = prices[cat];
        if (p.id) {
          await supabase.from('pricing_config').update({
            charge_type: p.charge_type,
            price_per_hour: Number(p.price_per_hour),
            price_first_hour: Number(p.price_first_hour),
            price_additional_hour: Number(p.price_additional_hour),
            price_daily: Number(p.price_daily),
            grace_period_minutes: Number(p.grace_period_minutes),
          }).eq('id', p.id);
        } else {
          await supabase.from('pricing_config').insert([{
            parking_id: currentUser.parkingId,
            category: cat,
            charge_type: p.charge_type,
            price_per_hour: Number(p.price_per_hour),
            price_first_hour: Number(p.price_first_hour),
            price_additional_hour: Number(p.price_additional_hour),
            price_daily: Number(p.price_daily),
            grace_period_minutes: Number(p.grace_period_minutes),
          }]);
        }
      }
      // Refresh
      const { data } = await supabase.from('pricing_config').select('*').eq('parking_id', currentUser.parkingId);
      setPricingConfig(data || []);
      toast.success('Preços salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar preços!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <DollarSign size={20} color="#f59e0b" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Preços e Cobrança</h1>
      </div>
      <div className="page-content">
        {CATEGORIES.map(cat => {
          const p = prices[cat.id] || {};
          return (
            <div key={cat.id} className="card" style={{ marginBottom: '16px', borderColor: `${cat.color}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                <span style={{ fontSize: '16px', fontWeight: '700', color: cat.color }}>{cat.label}</span>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Cobrança</label>
                <select className="form-input" value={p.charge_type || 'hora'} onChange={e => setP(cat.id, 'charge_type', e.target.value)}>
                  {CHARGE_TYPES.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
                </select>
              </div>

              {p.charge_type !== 'diaria' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">1ª Hora (R$)</label>
                    <input type="number" step="0.50" className="form-input" value={p.price_first_hour || ''} placeholder="0,00"
                      onChange={e => setP(cat.id, 'price_first_hour', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hora Adicional (R$)</label>
                    <input type="number" step="0.50" className="form-input" value={p.price_additional_hour || ''} placeholder="0,00"
                      onChange={e => setP(cat.id, 'price_additional_hour', e.target.value)} />
                  </div>
                </div>
              )}

              {p.charge_type === 'diaria' && (
                <div className="form-group">
                  <label className="form-label">Valor da Diária (R$)</label>
                  <input type="number" step="0.50" className="form-input" value={p.price_daily || ''} placeholder="0,00"
                    onChange={e => setP(cat.id, 'price_daily', e.target.value)} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Carência (minutos)</label>
                <input type="number" className="form-input" value={p.grace_period_minutes || 0} min={0}
                  onChange={e => setP(cat.id, 'grace_period_minutes', e.target.value)} />
              </div>
            </div>
          );
        })}

        <button className="btn btn-warning btn-full btn-lg" onClick={handleSave} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: '22px', height: '22px' }} /> : <><Save size={20} /> Salvar Preços</>}
        </button>
      </div>
    </div>
  );
}
