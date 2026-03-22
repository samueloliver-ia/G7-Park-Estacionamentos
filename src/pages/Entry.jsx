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
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Matemática do recorte (Crop) exato do miolo visualizado (object-fit: cover)
      const scale = Math.max(video.offsetWidth / video.videoWidth, video.offsetHeight / video.videoHeight);
      const sWidth = video.offsetWidth / scale;
      const sHeight = video.offsetHeight / scale;
      const sX = (video.videoWidth - sWidth) / 2;
      const sY = (video.videoHeight - sHeight) / 2;

      canvas.width = video.offsetWidth;
      canvas.height = video.offsetHeight;
      
      ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      
      const stream = videoRef.current.srcObject;
      stream?.getTracks().forEach(t => t.stop());
      setPhotoMode(false);
      
      const imageSrc = canvasRef.current.toDataURL('image/jpeg');
      toast.loading('Lendo a imagem (IA/OCR)...', { id: 'ocr' });

      try {
        const worker = await createWorker('por');
        const { data: { text } } = await worker.recognize(imageSrc);
        await worker.terminate();

        // 1. Limpa de vez tudo que não for letra ou número
        const rawText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        if (rawText.length < 7) {
            toast.error('Não identifiquei caracteres suficientes. Digite manualmente.', { id: 'ocr' });
            return;
        }

        // 2. Usar Janela Deslizante (Sliding Window) para achar o melhor bloco de 7 posições
        // Uma placa no BR (Antiga ou Mercosul) tem 3 letras no começo, 1 número, e 2 números no fim.
        let bestScore = -1;
        let bestGuess = '';

        const isLetter = (c) => /[A-Z]/.test(c);
        const isNumber = (c) => /[0-9]/.test(c);

        for (let i = 0; i <= rawText.length - 7; i++) {
           let window = rawText.substring(i, i + 7);
           let score = 0;
           
           if (isLetter(window[0])) score += 1;
           if (isLetter(window[1])) score += 1;
           if (isLetter(window[2])) score += 1;
           if (isNumber(window[3])) score += 1;
           if (isLetter(window[4]) || isNumber(window[4])) score += 1; 
           if (isNumber(window[5])) score += 1;
           if (isNumber(window[6])) score += 1;

           if (score > bestScore) {
               bestScore = score;
               bestGuess = window;
           }
        }

        // 3. Aplica a Força Bruta de Correção OCR no Ganhador
        let corrected = '';
        const letToNum = { 'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'G': '6', 'B': '8', 'Q': '0', 'T': '1', 'A': '4' };
        const numToLet = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B', '4': 'A' };

        for (let i = 0; i < 7; i++) {
            let char = bestGuess[i];
            if (i <= 2) { 
               // Força Ser Letra nas 3 primeiras posições
               corrected += numToLet[char] || char;
            } else if (i === 3) { 
               // Força Ser Número na 4º posição
               corrected += letToNum[char] || char;
            } else if (i === 4) { 
               // Pode ser Letra (Mercosul) ou Número (Antiga). Preserva puramente para evitar estragar:
               // Porem, 'O' confunde com '0', e '0' com 'O'. Geralmente Tesseract acerta a intenção do mercosul.
               corrected += char; 
            } else { 
               // Força ser Número nas últimas 2
               corrected += letToNum[char] || char;
            }
        }

        // Se o score foi péssimo (ex: lendo chão ou parede), avisa:
        if (bestScore <= 2) {
            toast.error('Nenhuma placa nítida encontrada. Digite manualmente.', { id: 'ocr' });
        } else {
            setPlate(formatPlate(corrected));
            toast.success('Placa detectada pela nova IA.', { id: 'ocr' });
        }
      } catch (e) {
        console.error('Erro OCR:', e);
        toast.error('Falha no processador. Digite a placa manualmente.', { id: 'ocr' });
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
              <div style={{
                position: 'relative', width: '100%', height: '140px', overflow: 'hidden', 
                borderRadius: '12px', background: '#000', marginBottom: '8px',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.2)'
              }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Marcador Visual Central - Moldura da placa */}
                <div style={{
                  position: 'absolute', top: '15%', left: '10%', right: '10%', bottom: '15%',
                  border: '2px dashed rgba(255,255,255,0.8)',
                  borderRadius: '8px', pointerEvents: 'none',
                  boxShadow: '0 0 0 1000px rgba(0,0,0,0.4)', // Escurece o entorno
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', letterSpacing: '1px' }}>
                    CENTRALIZAR PLACA
                  </span>
                </div>
              </div>

              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button className="btn btn-primary btn-full mt-2" onClick={capturePhoto}>
                <Camera size={16} /> Capturar Foto
              </button>
              <button className="btn btn-ghost btn-full mt-2" onClick={() => { setPhotoMode(false); videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop()); }}>
                Cancelar Câmera
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
