import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Users, Plus, Trash2, Edit2, X, Save, KeyRound, Eye, EyeOff, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = { administrador: 'Administrador', operador: 'Operador', caixa: 'Caixa' };
const ROLE_COLORS = { administrador: '#f59e0b', operador: '#4a8eff', caixa: '#10b981' };

const ROLE_PERMISSIONS_DESC = {
  administrador: 'Acesso total ao sistema',
  operador: 'Entrada, Saída, Pátio e Clientes',
  caixa: 'Entrada, Saída, Pátio e Caixa',
};

export default function Employees({ onBack }) {
  const { currentUser } = useApp();
  const isOwner = currentUser?.isOwner === true;

  // Guarda de segurança: bloqueia acesso de não-proprietários
  if (!isOwner) {
    return (
      <div className="page-wrapper">
        <div className="bg-animated" />
        <div className="page-header">
          <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
          <Users size={20} color="#10b981" />
          <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Funcionários</h1>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: '16px', textAlign: 'center',
          }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '20px',
              background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <KeyRound size={32} color="#ef4444" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Acesso Restrito</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
              Somente o <strong>proprietário</strong> pode gerenciar funcionários e criar acessos ao sistema.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', email: '', role: 'operador', salary: '', hire_date: '' });
  const [saving, setSaving] = useState(false);

  // Modal de Acesso
  const [accessModal, setAccessModal] = useState(null); // { employee }
  const [accessForm, setAccessForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('parking_id', currentUser.parkingId)
      .eq('status', 'ativo')
      .order('name');
    setEmployees(data || []);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm({ name: '', cpf: '', phone: '', email: '', role: 'operador', salary: '', hire_date: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (emp) => {
    setEditing(emp.id);
    setForm({ name: emp.name, cpf: emp.cpf || '', phone: emp.phone || '', email: emp.email || '', role: emp.role, salary: emp.salary || '', hire_date: emp.hire_date || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Nome é obrigatório!'); return; }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('employees').update({ ...form, salary: form.salary ? Number(form.salary) : null }).eq('id', editing);
        toast.success('Funcionário atualizado!');
      } else {
        await supabase.from('employees').insert([{ parking_id: currentUser.parkingId, ...form, salary: form.salary ? Number(form.salary) : null }]);
        toast.success('Funcionário cadastrado!');
      }
      resetForm();
      loadEmployees();
    } catch { toast.error('Erro ao salvar!'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Inativar este funcionário?')) return;
    await supabase.from('employees').update({ status: 'inativo' }).eq('id', id);
    loadEmployees();
    toast.success('Funcionário inativado!');
  };

  // ── Acesso ao App ──────────────────────────────────────────────────────────

  const openAccessModal = (emp) => {
    setAccessModal(emp);
    setAccessForm({
      username: emp.app_username || '',
      password: '',
      confirmPassword: '',
    });
    setShowPassword(false);
  };

  const handleSaveAccess = async () => {
    if (!accessForm.username.trim()) { toast.error('Informe um nome de usuário!'); return; }
    if (!accessModal.has_app_access || accessForm.password) {
      if (!accessForm.password) { toast.error('Informe uma senha!'); return; }
      if (accessForm.password.length < 4) { toast.error('A senha deve ter pelo menos 4 caracteres!'); return; }
      if (accessForm.password !== accessForm.confirmPassword) { toast.error('As senhas não coincidem!'); return; }
    }
    setSavingAccess(true);
    try {
      const updateData = {
        app_username: accessForm.username.trim().toLowerCase(),
        has_app_access: true,
      };
      if (accessForm.password) {
        updateData.app_password = accessForm.password;
      }
      const { error } = await supabase.from('employees').update(updateData).eq('id', accessModal.id);
      if (error) {
        if (error.code === '23505') throw new Error('Este nome de usuário já está em uso!');
        throw error;
      }
      toast.success('Acesso ao app configurado!');
      setAccessModal(null);
      loadEmployees();
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar acesso!');
    } finally { setSavingAccess(false); }
  };

  const handleRevokeAccess = async (emp) => {
    if (!confirm(`Remover acesso ao app de ${emp.name}?`)) return;
    await supabase.from('employees').update({ has_app_access: false, app_username: null, app_password: null }).eq('id', emp.id);
    toast.success('Acesso removido!');
    loadEmployees();
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="page-wrapper">
      <div className="bg-animated" />
      <div className="page-header">
        <button onClick={onBack} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <Users size={20} color="#10b981" />
        <h1 style={{ fontSize: '18px', fontWeight: '700' }}>Funcionários</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-success btn-sm" style={{ marginLeft: 'auto' }}>
          <Plus size={16} /> Novo
        </button>
      </div>
      <div className="page-content">

        {/* ── Formulário ── */}
        {showForm && (
          <div className="card mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="section-title" style={{ margin: 0 }}>{editing ? 'Editar' : 'Novo'} Funcionário</div>
              <button className="btn btn-ghost btn-sm" onClick={resetForm}><X size={16} /></button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="form-group">
                <label className="form-label">CPF</label>
                <input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Cargo</label>
                <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {ROLE_PERMISSIONS_DESC[form.role]}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Salário (R$)</label>
                <input type="number" step="0.01" className="form-input" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Data de Contratação</label>
              <input type="date" className="form-input" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-success btn-full" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : <><Save size={16} /> Salvar</>}
              </button>
              <button className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {employees.map(emp => (
              <div key={emp.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px',
                padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                {/* Linha principal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: `${ROLE_COLORS[emp.role] || '#4a8eff'}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: '800', color: ROLE_COLORS[emp.role] || '#4a8eff',
                  }}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.phone || emp.email || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '4px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px',
                      background: `${ROLE_COLORS[emp.role] || '#4a8eff'}18`, color: ROLE_COLORS[emp.role] || '#4a8eff',
                    }}>{ROLES[emp.role]}</span>
                    {emp.salary && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>R$ {Number(emp.salary).toFixed(2)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(emp)}><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(emp.id)}><Trash2 size={14} color="#ef4444" /></button>
                  </div>
                </div>

                {/* Linha de Acesso ao App */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '10px',
                  background: emp.has_app_access ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${emp.has_app_access ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                }}>
                  {emp.has_app_access ? (
                    <ShieldCheck size={16} color="#10b981" strokeWidth={2.5} />
                  ) : (
                    <ShieldOff size={16} color="var(--text-secondary)" strokeWidth={2} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: emp.has_app_access ? '#10b981' : 'var(--text-secondary)' }}>
                      {emp.has_app_access ? `Acesso ativo — @${emp.app_username}` : 'Sem acesso ao app'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {emp.has_app_access ? ROLE_PERMISSIONS_DESC[emp.role] : 'Clique para criar acesso'}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => openAccessModal(emp)}
                    style={{
                      background: emp.has_app_access ? 'rgba(74,142,255,0.12)' : 'rgba(16,185,129,0.12)',
                      color: emp.has_app_access ? '#4a8eff' : '#10b981',
                      border: 'none', borderRadius: '8px', padding: '5px 10px',
                      display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600',
                    }}
                  >
                    <KeyRound size={13} />
                    {emp.has_app_access ? 'Editar' : 'Criar Acesso'}
                  </button>
                  {emp.has_app_access && (
                    <button
                      onClick={() => handleRevokeAccess(emp)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none',
                        borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px',
                      }}
                      title="Remover acesso"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Nenhum funcionário cadastrado.</div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de Acesso ── */}
      {accessModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: `${ROLE_COLORS[accessModal.role] || '#4a8eff'}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '800', color: ROLE_COLORS[accessModal.role] || '#4a8eff',
              }}>
                {accessModal.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{accessModal.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ROLES[accessModal.role]}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAccessModal(null)}><X size={16} /></button>
            </div>

            {/* Permissões do cargo */}
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '20px',
              background: `${ROLE_COLORS[accessModal.role] || '#4a8eff'}12`,
              border: `1px solid ${ROLE_COLORS[accessModal.role] || '#4a8eff'}30`,
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: ROLE_COLORS[accessModal.role] || '#4a8eff', marginBottom: '4px' }}>
                PERMISSÕES DO CARGO
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {ROLE_PERMISSIONS_DESC[accessModal.role]}
              </div>
            </div>

            {/* Campos */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Nome de usuário *</label>
              <input
                className="form-input"
                value={accessForm.username}
                onChange={e => setAccessForm(f => ({ ...f, username: e.target.value }))}
                placeholder="ex: joao.silva"
                autoComplete="off"
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Será usado no login. Apenas letras, números e pontos.
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">
                {accessModal.has_app_access ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={accessForm.password}
                  onChange={e => setAccessForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 4 caracteres"
                  style={{ paddingRight: '44px' }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {accessForm.password && (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Confirmar senha *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={accessForm.confirmPassword}
                  onChange={e => setAccessForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repita a senha"
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-success btn-full" onClick={handleSaveAccess} disabled={savingAccess}>
                {savingAccess ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : <><Save size={15} /> Salvar Acesso</>}
              </button>
              <button className="btn btn-ghost" onClick={() => setAccessModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
