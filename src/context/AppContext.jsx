import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Preferences } from '@capacitor/preferences';

const AppContext = createContext(null);

// ─── Permissões por cargo ──────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  owner:         ['entry', 'exit', 'yard', 'admin', 'customers', 'cash'],
  administrador: ['entry', 'exit', 'yard', 'admin', 'customers', 'cash'],
  operador:      ['entry', 'exit', 'yard', 'customers'],
  caixa:         ['entry', 'exit', 'yard', 'cash'],
};

export const hasPermission = (role, permission) => {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['operador'];
  return perms.includes(permission);
};

export const ROLE_LABELS = {
  owner: 'Proprietário',
  administrador: 'Administrador',
  operador: 'Operador',
  caixa: 'Caixa',
};

// ──────────────────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [parkingConfig, setParkingConfig] = useState(null);
  const [pricingConfig, setPricingConfig] = useState([]);
  const [printerConfig, setPrinterConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { value } = await Preferences.get({ key: 'g7park_auth' });
        if (value) {
          const data = JSON.parse(value);
          setCurrentUser(data);
          setIsAuthenticated(true);
          await loadParkingData(data.parkingId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro auth init:", err);
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadParkingData = async (parkingId) => {
    try {
      const { data: config } = await supabase
        .from('parking_config')
        .select('*')
        .eq('id', parkingId)
        .single();
      if (config) setParkingConfig(config);

      const { data: pricing } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('parking_id', parkingId);
      if (pricing) setPricingConfig(pricing);

      const { data: printer } = await supabase
        .from('printer_config')
        .select('*')
        .eq('parking_id', parkingId)
        .single();
      if (printer) setPrinterConfig(printer);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    // 1. Tenta como dono (email no parking_config)
    const { data: owner } = await supabase
      .from('parking_config')
      .select('*')
      .eq('email', username.trim().toLowerCase())
      .maybeSingle();

    if (owner) {
      if (owner.password_hash !== password) throw new Error('Senha incorreta!');
      const userData = {
        parkingId: owner.id,
        email: owner.email,
        name: owner.owner_name,
        role: 'owner',
        isOwner: true,
      };
      setCurrentUser(userData);
      setIsAuthenticated(true);
      await Preferences.set({ key: 'g7park_auth', value: JSON.stringify(userData) });
      await loadParkingData(owner.id);
      return { ...owner, role: 'owner' };
    }

    // 2. Tenta como funcionário (app_username)
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('app_username', username.trim().toLowerCase())
      .eq('has_app_access', true)
      .eq('status', 'ativo')
      .maybeSingle();

    if (!employee) throw new Error('Usuário não encontrado!');
    if (employee.app_password !== password) throw new Error('Senha incorreta!');

    const userData = {
      parkingId: employee.parking_id,
      email: employee.email,
      name: employee.name,
      role: employee.role,     // 'administrador' | 'operador' | 'caixa'
      employeeId: employee.id,
      isEmployee: true,
    };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    await Preferences.set({ key: 'g7park_auth', value: JSON.stringify(userData) });
    await loadParkingData(employee.parking_id);
    return employee;
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setParkingConfig(null);
    await Preferences.remove({ key: 'g7park_auth' });
  };

  const register = async (formData) => {
    const { data, error } = await supabase
      .from('parking_config')
      .insert([{
        owner_name: formData.ownerName,
        email: formData.email,
        parking_name: formData.parkingName,
        address: formData.address,
        cep: formData.cep,
        password_hash: formData.password,
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('pricing_config').insert([
      { parking_id: data.id, category: 'pequeno', charge_type: 'hora', price_per_hour: 5.00, price_first_hour: 5.00, price_additional_hour: 3.00 },
      { parking_id: data.id, category: 'medio',   charge_type: 'hora', price_per_hour: 8.00, price_first_hour: 8.00, price_additional_hour: 5.00 },
      { parking_id: data.id, category: 'grande',  charge_type: 'hora', price_per_hour: 12.00, price_first_hour: 12.00, price_additional_hour: 8.00 },
    ]);

    const userData = { parkingId: data.id, email: data.email, name: data.owner_name, role: 'owner', isOwner: true };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    await Preferences.set({ key: 'g7park_auth', value: JSON.stringify(userData) });
    await loadParkingData(data.id);
    return data;
  };

  const refreshData = () => {
    if (currentUser?.parkingId) loadParkingData(currentUser.parkingId);
  };

  // Helper de permissão para usar nos componentes
  const can = (permission) => hasPermission(currentUser?.role || 'operador', permission);

  return (
    <AppContext.Provider value={{
      parkingConfig, pricingConfig, printerConfig,
      loading, isAuthenticated, currentUser,
      login, logout, register, refreshData,
      setParkingConfig, setPricingConfig, setPrinterConfig,
      can,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
