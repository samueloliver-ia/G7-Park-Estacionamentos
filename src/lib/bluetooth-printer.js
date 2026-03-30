/**
 * Bluetooth Thermal Printer Driver
 * Compatível com: Mini thermal print YQ-8609 - 58mm
 * Usa a Web Bluetooth API para comunicação direta
 */

// ESC/POS Command constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;
const COMMANDS = {
  INIT: [ESC, 0x40],                          // Inicializar
  ALIGN_CENTER: [ESC, 0x61, 0x01],            // Centralizar
  ALIGN_LEFT: [ESC, 0x61, 0x00],              // Alinhar esquerda
  ALIGN_RIGHT: [ESC, 0x61, 0x02],             // Alinhar direita
  BOLD_ON: [ESC, 0x45, 0x01],                 // Negrito ON
  BOLD_OFF: [ESC, 0x45, 0x00],                // Negrito OFF
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],         // Texto grande
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],          // Largura dupla
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11],           // Tamanho duplo
  NORMAL_SIZE: [GS, 0x21, 0x00],              // Tamanho normal
  UNDERLINE_ON: [ESC, 0x2D, 0x01],            // Sublinhado
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],           // Sem sublinhado
  CUT_PAPER: [GS, 0x56, 0x00],               // Cortar papel
  PARTIAL_CUT: [GS, 0x56, 0x01],             // Corte parcial
  FEED_LINE: [LF],                             // Alimentar linha
  FEED_LINES: (n) => [ESC, 0x64, n],          // Alimentar N linhas
  LINE_SPACING: (n) => [ESC, 0x33, n],        // Espaçamento
  CHAR_SIZE: (w, h) => [GS, 0x21, ((w - 1) << 4) | (h - 1)],
};

class BluetoothPrinter {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.connected = false;
    this.deviceName = '';
    // UUIDs comuns para impressoras térmicas Bluetooth SPP
    this.SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
    this.CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';
    // Alternativas
    this.ALT_UUIDS = [
      { service: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' },
      { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
      { service: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' },
      { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
    ];
  }

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth não é suportado neste navegador. Use Chrome ou Edge.');
    }

    try {
      // Buscar dispositivos Bluetooth com os UUIDs de serviço conhecidos
      const serviceUuids = this.ALT_UUIDS.map(u => u.service);
      
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Printer' },
          { namePrefix: 'printer' },
          { namePrefix: 'YQ' },
          { namePrefix: 'BT' },
          { namePrefix: 'MPT' },
          { namePrefix: 'RPP' },
          { namePrefix: 'PT-' },
          { namePrefix: 'MTP' },
          { namePrefix: 'Thermal' },
        ],
        optionalServices: serviceUuids,
      });

      this.deviceName = this.device.name || 'Impressora';
      this.device.addEventListener('gattserverdisconnected', () => {
        this.connected = false;
        this.characteristic = null;
      });

      this.server = await this.device.gatt.connect();

      // Tentar cada UUID de serviço
      for (const uuid of this.ALT_UUIDS) {
        try {
          this.service = await this.server.getPrimaryService(uuid.service);
          this.characteristic = await this.service.getCharacteristic(uuid.char);
          this.connected = true;
          return { success: true, name: this.deviceName };
        } catch { continue; }
      }

      throw new Error('Serviço de impressão não encontrado no dispositivo.');
    } catch (err) {
      this.connected = false;
      const msg = err?.message || String(err) || 'Erro desconhecido';
      if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('User cancelled')) {
        throw new Error('Seleção cancelada pelo usuário.');
      }
      throw new Error(`Falha no pareamento: ${msg}`);
    }
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.connected = false;
    this.characteristic = null;
  }

  async _write(data) {
    if (!this.connected || !this.characteristic) {
      throw new Error('Impressora não conectada!');
    }
    // Enviar em chunks de no máximo 100 bytes (limitação BLE)
    const CHUNK_SIZE = 100;
    const uint8 = new Uint8Array(data);
    for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
      const chunk = uint8.slice(i, i + CHUNK_SIZE);
      await this.characteristic.writeValueWithoutResponse(chunk);
      await new Promise(r => setTimeout(r, 50)); // delay entre chunks
    }
  }

  _text(str) {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
  }

  _line(char = '-', count = 32) {
    return this._text(char.repeat(count));
  }

  async printEntryTicket({ parkingName, plate, controlNumber, category, entryTime }) {
    const time = new Date(entryTime).toLocaleString('pt-BR');
    const data = [
      ...COMMANDS.INIT,
      ...COMMANDS.ALIGN_CENTER,
      ...COMMANDS.BOLD_ON,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...this._text(parkingName || 'G7 PARK'),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...this._text('RECIBO DE ENTRADA'),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...COMMANDS.BOLD_ON,
      ...this._text(plate),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.ALIGN_LEFT,
      ...this._text(`Controle: #${String(controlNumber).padStart(4, '0')}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Categoria: ${category}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Entrada:  ${time}`),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.ALIGN_CENTER,
      ...this._text('Apresente na saida'),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.FEED_LINES(4),
      ...COMMANDS.PARTIAL_CUT,
    ];
    await this._write(data);
  }

  async printExitReceipt({ parkingName, plate, controlNumber, category, entryTime, exitTime, duration, amount, paymentMethod }) {
    const entry = new Date(entryTime).toLocaleString('pt-BR');
    const exit = new Date(exitTime).toLocaleString('pt-BR');
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const pmLabel = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_debito: 'Debito', cartao_credito: 'Credito' }[paymentMethod] || paymentMethod;

    const data = [
      ...COMMANDS.INIT,
      ...COMMANDS.ALIGN_CENTER,
      ...COMMANDS.BOLD_ON,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...this._text(parkingName || 'G7 PARK'),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...this._text('RECIBO DE SAIDA'),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...COMMANDS.BOLD_ON,
      ...this._text(plate),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.ALIGN_LEFT,
      ...this._text(`Controle: #${String(controlNumber).padStart(4, '0')}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Categoria: ${category}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Entrada:  ${entry}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Saida:    ${exit}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Duracao:  ${hours}h ${mins}min`),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.ALIGN_CENTER,
      ...COMMANDS.BOLD_ON,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...this._text(`R$ ${Number(amount).toFixed(2)}`),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...this._text(`Pagto: ${pmLabel}`),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...this._text('Obrigado pela preferencia!'),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.FEED_LINES(4),
      ...COMMANDS.PARTIAL_CUT,
    ];
    await this._write(data);
  }

  async printDailyReport({ parkingName, date, totalVehicles, totalRevenue, totalExpenses, balance, movements }) {
    const data = [
      ...COMMANDS.INIT,
      ...COMMANDS.ALIGN_CENTER,
      ...COMMANDS.BOLD_ON,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...this._text(parkingName || 'G7 PARK'),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...this._text('CAIXA DIARIO'),
      ...COMMANDS.FEED_LINE,
      ...this._text(date),
      ...COMMANDS.FEED_LINE,
      ...this._line('=', 32),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.ALIGN_LEFT,
      ...this._text(`Veiculos:   ${totalVehicles}`),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.BOLD_ON,
      ...this._text(`Entradas:   R$ ${Number(totalRevenue).toFixed(2)}`),
      ...COMMANDS.FEED_LINE,
      ...this._text(`Saidas:     R$ ${Number(totalExpenses).toFixed(2)}`),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...this._text(`SALDO: R$ ${Number(balance).toFixed(2)}`),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...COMMANDS.FEED_LINES(4),
      ...COMMANDS.PARTIAL_CUT,
    ];
    await this._write(data);
  }

  async testPrint() {
    const data = [
      ...COMMANDS.INIT,
      ...COMMANDS.ALIGN_CENTER,
      ...COMMANDS.BOLD_ON,
      ...COMMANDS.DOUBLE_SIZE_ON,
      ...this._text('G7 PARK'),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.NORMAL_SIZE,
      ...COMMANDS.BOLD_OFF,
      ...this._text('Teste de Impressao'),
      ...COMMANDS.FEED_LINE,
      ...this._line('-', 32),
      ...COMMANDS.FEED_LINE,
      ...this._text('Impressora OK!'),
      ...COMMANDS.FEED_LINE,
      ...this._text(new Date().toLocaleString('pt-BR')),
      ...COMMANDS.FEED_LINE,
      ...COMMANDS.FEED_LINES(4),
      ...COMMANDS.PARTIAL_CUT,
    ];
    await this._write(data);
  }
}

// Instância singleton
export const printer = new BluetoothPrinter();
export default printer;
