export type WiperReading = {
  angle: number;
  pressure: number;
  count: number;
  timestamp: number;
};

export type CalibrationData = {
  initialAngle: number;
  endAngle: number;
  center: number;
};

export type BluetoothDeviceInfo = {
  id: string;
  name: string;
  bonded: boolean;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
