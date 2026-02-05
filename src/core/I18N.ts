import fs from 'fs';
import path from 'path';
import { interpolate } from '../utils/formatters.js';

export class I18N {
	private translations: Map<string, any>;

	public constructor() {
		this.translations = new Map();
	}

	public loadLocales() {
		const localesPath = path.join(process.cwd(), 'dist/locales');

		if (!fs.existsSync(localesPath)) {
			throw new Error(`Locales folder not found at ${localesPath}`);
		}
		const files = fs.readdirSync(localesPath);

		for (const file of files) {
			if (file.endsWith('.json')) {
				const locale = path.parse(file).name;
				const content = fs.readFileSync(path.join(localesPath, file), 'utf-8');
				this.translations.set(locale, JSON.parse(content));
			}
		}
	}

	private getNestedValue(bundle: any, path: string): string | null {
		const keys = path.split('.');
		let value = bundle;
		
		for (const key of keys) {
			if (value == null || value == undefined) {
				return null;
			}
			value = value[key];
		}
		return typeof value == 'string' ? value : null;
	}

	public translate(locale: string, path: string, vars: Record<string, any> = {}): string {
		const lang = this.translations.has(locale) ? locale : 'en';
		const bundle = this.translations.get(lang);
		const template = this.getNestedValue(bundle, path);

		if (template == null) {
			return path;
		}
		return interpolate(template, vars);
	}
}