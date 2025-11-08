export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DEBUG = 'debug'
}

export class ShiveronLogger {
	private static pad(num: number): string {
		return num.toString().padStart(2, '0');
	}

	private static getCurrentTimestampFormatted(): string {
		const currentDate = new Date();
		const day = this.pad(currentDate.getDate());
		const month = this.pad(currentDate.getMonth() + 1);
		const year = currentDate.getFullYear();
		const hours = this.pad(currentDate.getHours());
		const minutes = this.pad(currentDate.getMinutes());
		const seconds = this.pad(currentDate.getSeconds());

		return `[${day}/${month}/${year} ${hours}:${minutes}:${seconds}]`;
	}

	private static formatMessage(level: LogLevel, message: string): string {
		return `${this.getCurrentTimestampFormatted()} [${level}] ${message}`;
	}

	public static info(message: string) {
		console.info(this.formatMessage(LogLevel.INFO, message));
	}

	public static warn(message: string) {
		console.warn(this.formatMessage(LogLevel.WARN, message));
	}

	public static error(message: string) {
		console.error(this.formatMessage(LogLevel.ERROR, message));
	}

	public static debug(message: string) {
		console.debug(this.formatMessage(LogLevel.DEBUG, message));
	}
}