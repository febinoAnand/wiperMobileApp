export type WiperReading = {
  angle: number;
  pressure: number;
  timestamp: number;
  /** Present on `{"type":"wipe",...}` events - the device's running wipe sequence number. */
  seq?: number;
  dir?: string;
};

/** Response to a command, e.g. `{"type":"ack","cmd":"set_initial","status":"ok","angle":42.3}`. */
export type AckMessage = {
  type: 'ack';
  cmd: string;
  status: string;
  angle?: number;
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
