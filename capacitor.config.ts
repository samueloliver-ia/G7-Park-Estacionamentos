import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.g7park.estacionamento',
  appName: 'G7 Park',
  webDir: 'dist',

  // ✅ MODO CASCA: carrega o site do Vercel
  // Qualquer atualização no Vercel atualiza o app automaticamente
  server: {
    url: 'https://g7-park-estacionamentos.vercel.app',
    cleartext: false,
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
