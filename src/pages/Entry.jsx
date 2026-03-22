import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Camera, Keyboard, Printer, Car, CheckCircle, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { createWorker } from 'tesseract.js';

const CATEGORIES = [
  { id: 'pequeno', label: 'Pequeno', icon: '🚗', desc: 'Carros de passeio' },
  { id: 'medio', label: 'Médio', icon: '🚙', desc: 'SUVs e pickups' },
  { id: 'grande', label: 'Grande', icon: '🚌', desc: 'Vans e caminhões' },
];

export default function Entry() {
  const { currentUser, pricingConfig, printerConfig } = useApp();
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [category, setCategory] = useState('pequeno');
  const [photoMode, setPhotoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const formatPlate = (v) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return clean.slice(0, 3) + '-' + clean.slice(3);
    return clean.slice(0, 3) + '-' + clean.slice(3, 7);
  };

  const handleEntry = async () => {
    if (!plate || plate.length < 7) { toast.error('Placa inválida!'); return; }
    if (!category) { toast.error('Selecione a categoria!'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          parking_id: currentUser.parkingId,
          plate: plate.replace('-', ''),
          category,
          entry_time: new Date().toISOString(),
          status: 'ativo',
        }])
        .select()
        .single();

      if (error) throw error;
      setTicket(data);
      toast.success('Entrada registrada!');
    } catch (err) {
      toast.error('Erro ao registrar entrada!');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setPhotoMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      toast.error('Câmera não disponível!');
      setPhotoMode(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      const stream = videoRef.current.srcObject;
      stream?.getTracks().forEach(t => t.stop());
      setPhotoMode(false);
      
      const imageSrc = canvasRef.current.toDataURL('image/jpeg');
      toast.loading('Lendo a imagem (IA/OCR)...', { id: 'ocr' });

      try {
        const worker = await createWorker('por');
        const { data: { text } } = await worker.recognize(imageSrc);
        await worker.terminate();

        const rawText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        // 1. Procura exata por placa padrão Mercosul (AAA1A12) ou Antiga (AAA1234)
        const strictMatch = rawText.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/);
        
        if (strictMatch) {
          setPlate(formatPlate(strictMatch[0]));
          toast.success('Placa detectada perfeitamente!', { id: 'ocr' });
          return;
        }

        // 2. Fallback: Procura string de 7 caracteres mais provável
        let bestGuess = '';
        const possiblePlates = rawText.match(/[A-Z0-9]{7}/g);
        if (possiblePlates && possiblePlates.length > 0) {
            bestGuess = possiblePlates.find(p => /^[A-Z]{2,3}/.test(p)) || possiblePlates[0];
        } else if (rawText.length >= 7) {
            bestGuess = rawText.slice(-7);
        }

        if (bestGuess.length === 7) {
            // Corrige confusões comuns e clássicas do OCR para placas Brasileiras
            let corrected = '';
            const letToNum = { 'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'G': '6', 'B': '8', 'Q': '0', 'T': '1', 'A': '4' };
            const numToLet = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B', '4': 'A' };

            for (let i = 0; i < 7; i++) {
                let char = bestGuess[i];
                if (i <= 2) { // AAA: Primeiros 3 sempre letras
                   corrected += numToLet[char] || char;
                } else if (i === 3) { // 1: 4º char sempre número
                   corrected += letToNum[char] || char;
                } else if (i === 4) { // A/1: 5º char letra ou numero (Mercosul/Antigo), preservamos cru
                   corrected += char; 
                } else { // 12: 6º e 7º char sempre numeros
                   corrected += letToNum[char] || char;
                }
            }

            setPlate(formatPlate(corrected));
            toast.success('Placa lida (auto-corrigida)! Confira.', { id: 'ocr' });
        } else {
            toast.error('Não achei a placa exata. Digite manualmente.', { id: 'ocr' });
        }
      } catch (e) {
        console.error('Erro OCR:', e);
        toast.error('Falha no processador. Digite a placa manualmente.', { id: 'ocr' });
      }
    }
  };

  if (ticket) {
    const qrData = JSON.stringify({ id: ticket.id, plate: ticket.plate, entry: ticket.entry_time, control: ticket.control_number });
    return (
      <div className="page-wrapper">
        <div className="bg-animated" />
        <div className="page-header">
          <button onClick={() => { setTicket(null); setPlate(''); setCategory('pequeno'); }} className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Recibo de Entrada</h1>
        </div>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle size={32} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>Entrada Registrada!</h2>
          </div>

          {/* Ticket */}
          <div id="ticket-print" style={{
            background: '#fff', color: '#000', borderRadius: '16px',
            padding: '28px', width: '100%', maxWidth: '340px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: '900', marginBottom: '4px', color: '#1a6af5' }}>G7 PARK</div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>RECIBO DE ENTRADA</div>
            <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '16px 0', marginBottom: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '4px', marginBottom: '8px' }}>{ticket.plate}</div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                Nº Controle: <strong>#{String(ticket.control_number).padStart(4, '0')}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                Categoria: <strong>{CATEGORIES.find(c => c.id === ticket.category)?.label}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#555' }}>
                Entrada: <strong>{new Date(ticket.entry_time).toLocaleString('pt-BR')}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div className="qr-container">
                <QRCodeSVG value={qrData} size={150} />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>Apresente este recibo na saída</div>
          </div>

          <div className="flex gap-3 mt-4" style={{ width: '100%', maxWidth: '340px' }}>
            <button className="btn btn-primary btn-full" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => { setTicket(null); setPlate(''); setCategory('pequeno'); }}>
              Nova Entrada
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <Car size={20} color="#fff" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Registrar Entrada</h1>
      </div>

      <div className="page-content">
        {/* Placa */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="section-title"><Hash size={18} color="#4a8eff" /> Dados do Veículo</div>
          <div className="form-group">
            <label className="form-label">Placa do Veículo</label>
            <div className="flex gap-2">
              <input
                className="form-input"
                style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase', flex: 1 }}
                placeholder="ABC-1234"
                value={plate}
                maxLength={8}
                onChange={e => setPlate(formatPlate(e.target.value))}
              />
              <button className="btn btn-ghost" onClick={startCamera}>
                <Camera size={20} />
              </button>
            </div>
          </div>

          {photoMode && (
            <div style={{ marginTop: '12px' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button className="btn btn-primary btn-full mt-2" onClick={capturePhoto}>
                <Camera size={16} /> Capturar Foto
              </button>
            </div>
          )}
        </div>

        {/* Categoria */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="section-title">🚗 Categoria</div>
          <div className="flex gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`category-chip ${category === cat.id ? 'selected ' + cat.id : ''}`}
                style={{ flex: 1, flexDirection: 'column', display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 8px' }}
              >
                <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preço estimado */}
        {pricingConfig.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: '16px' }}>
            💰 Preço para {CATEGORIES.find(c => c.id === category)?.label}: R$ {
              pricingConfig.find(p => p.category === category)?.price_first_hour?.toFixed(2) || '—'
            } / 1ª hora
          </div>
        )}

        <button
          className="btn btn-success btn-full btn-lg"
          onClick={handleEntry}
          disabled={loading || !plate}
        >
          {loading ? <span className="spinner" style={{ width: '22px', height: '22px' }} /> : (
            <><Car size={20} /> Registrar Entrada</>
          )}
        </button>
      </div>
    </div>
  );
}
