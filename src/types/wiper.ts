/** Combined idle-stream reading: `{"angleL":81.00,"angleR":77.90,"rawL":81.00,"rawR":77.90,"pressure":4.50}` */
export type DualWiperReading = {
  angleL: number;
  angleR: number;
  pressure: number;
  timestamp: number;
};

export type WiperReading = {
  angle: number;
  pressure: number;
  timestamp: number;
  /** Present on `{"type":"wipe",...}` events - the device's running wipe sequence number. */
  seq?: number;
  dir?: string;
  /** Which physical wiper this reading belongs to. Absent on legacy single-wiper firmware. */
  wiper_no?: number | string;
};

/** Response to a command, e.g. `{"type":"ack","cmd":"set_initial","sensor":"left","status":"ok","angle":42.3}`. */
export type AckMessage = {
  type: 'ack';
  cmd: string;
  status: string;
  angle?: number;
  sensor?: string;
};

/** One entry within a `resend` session report batch. */
export type WipeRecord = {
  seq: number;
  dir: string;
  angle: number;
  pressure: number;
};

/** Full session report assembled from `session_start` + `batch`(es) + `session_end` after a `resend` command. */
export type SessionReport = {
  wiperNo: number | string;
  timestamp: number;
  duration: number;
  wipes: number;
  strokes: number;
  records: WipeRecord[];
};

/** A SessionReport saved to the on-device reports list, tagged with a unique id for list rendering. */
export type SessionReportEntry = SessionReport & { id: string };

export type SensorCalibration = {
  initialAngle: number;
  endAngle: number;
  center: number;
};

export type CalibrationData = {
  left: SensorCalibration;
  right: SensorCalibration;
};

export type BluetoothDeviceInfo = {
  id: string;
  name: string;
  bonded: boolean;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
