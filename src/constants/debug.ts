export const DEBUG = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (...args: any[]) => { if (DEBUG) console.log(...args); };
