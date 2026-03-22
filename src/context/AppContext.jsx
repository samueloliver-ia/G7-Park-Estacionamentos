import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [parkingConfig, setParkingConfig] = useState(null);
  const [pricingConfig, setPricingConfig] = useState([]);
  const [printerConfig, setPrinterConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('g7park_auth');
    if (stored) {
      const data = JSON.parse(stored);
      setCurrentUser(data);
      setIsAuthenticated(true);
      loadParkingData(data.parkingId);
    } else {
      setLoading(false);
    }
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

  const login = async (email, password) => {
    const { data, error } = await supabase
      .from('parking_config')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) throw new Error('E-mail não encontrado!');

    // Verificação simples de senha (em produção use auth do Supabase)
    if (data.password_hash !== password) throw new Error('Senha incorreta!');

    const userData = { parkingId: data.id, email: data.email, name: data.owner_name };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('g7park_auth', JSON.stringify(userData));
    await loadParkingData(data.id);
    return data;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setParkingConfig(null);
    localStorage.removeItem('g7park_auth');
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

    // Inserir preços padrão
    await supabase.from('pricing_config').insert([
      { parking_id: data.id, category: 'pequeno', charge_type: 'hora', price_per_hour: 5.00, price_first_hour: 5.00, price_additional_hour: 3.00 },
      { parking_id: data.id, category: 'medio', charge_type: 'hora', price_per_hour: 8.00, price_first_hour: 8.00, price_additional_hour: 5.00 },
      { parking_id: data.id, category: 'grande', charge_type: 'hora', price_per_hour: 12.00, price_first_hour: 12.00, price_additional_hour: 8.00 },
    ]);

    const userData = { parkingId: data.id, email: data.email, name: data.owner_name };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('g7park_auth', JSON.stringify(userData));
    await loadParkingData(data.id);
    return data;
  };

  const refreshData = () => {
    if (currentUser?.parkingId) loadParkingData(currentUser.parkingId);
  };

  return (
    <AppContext.Provider value={{
      parkingConfig, pricingConfig, printerConfig,
      loading, isAuthenticated, currentUser,
      login, logout, register, refreshData,
      setParkingConfig, setPricingConfig, setPrinterConfig,
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
