export class LoggerService {
  public log(message: string, ...meta: unknown[]): void {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...meta);
  }

  public error(message: string, error?: any, ...meta: unknown[]): void {
    console.error(
      `[ERROR] ${new Date().toISOString()}: ${message}`,
      ...(error ? ['Error:', error] : []),
      ...meta,
    );
  }

  public warn(message: string, ...meta: unknown[]): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...meta);
  }
}

export const logger = new LoggerService(); 