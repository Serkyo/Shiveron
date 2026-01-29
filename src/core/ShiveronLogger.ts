import path from 'path';
import fs from 'fs';

export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DEBUG = 'debug'
}

export class ShiveronLogger {
	private logDir = path.join(process.cwd(), 'logs');
	private standardLog = path.join(this.logDir, 'standard.log');
	private debugLog = path.join(this.logDir, 'debug.log');

	public constructor() {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}

	private pad(num: number): string {
		return num.toString().padStart(2, '0');
	}

	private getCurrentTimestampFormatted(): string {
		const currentDate = new Date();
		const day = this.pad(currentDate.getDate());
		const month = this.pad(currentDate.getMonth() + 1);
		const year = currentDate.getFullYear();
		const hours = this.pad(currentDate.getHours());
		const minutes = this.pad(currentDate.getMinutes());
		const seconds = this.pad(currentDate.getSeconds());

		return `[${day}/${month}/${year} ${hours}:${minutes}:${seconds}]`;
	}

	private formatMessage(level: LogLevel, message: string): string {
		return `${this.getCurrentTimestampFormatted()} [${level}] ${message}`;
	}

	private async writeToFile(level: LogLevel, formattedMessage: string) {
		if (level != LogLevel.DEBUG) {
			fs.appendFile(this.standardLog, formattedMessage + '\n', error => {
				if (error) {
					console.error('Log Error (standard.log):', error);
				}
			});
		}
		fs.appendFile(this.debugLog, formattedMessage + '\n', error => {
			if (error) {
				console.error('Log Error (debug.log):', error);
			}
		});
	}

	public info(message: string): void {
		const formatted = this.formatMessage(LogLevel.INFO, message);
		console.info(formatted);
		this.writeToFile(LogLevel.INFO, formatted);
	}

	public warn(message: string): void {
		const formatted = this.formatMessage(LogLevel.WARN, message);
		console.warn(formatted);
		this.writeToFile(LogLevel.WARN, formatted);
	}

	public error(message: string): void {
		const formatted = this.formatMessage(LogLevel.ERROR, message);
		console.error(formatted);
		this.writeToFile(LogLevel.ERROR, formatted);
	}

	public debug(message: string): void {
		const formatted = this.formatMessage(LogLevel.DEBUG, message);
		console.debug(formatted);
		this.writeToFile(LogLevel.DEBUG, formatted);
	}
}