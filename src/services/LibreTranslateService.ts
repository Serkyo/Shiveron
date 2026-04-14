import { ShiveronLogger } from '../core/ShiveronLogger.js';
import { getConfig } from '../utils/config.js';

/**
 * Wraps the LibreTranslate HTTP API.
 *
 * Supports:
 * - Single-string translation with optional auto-detection of the source language
 * - Language detection with confidence scores (used to skip low-confidence detections)
 * - Full locale bundle translation for the I18N system
 * - Listing all languages supported by the running instance
 * - Health check to detect when the service is unavailable
 */
export class LibreTranslateService {
	private readonly baseUrl: string;
	private readonly logger: ShiveronLogger;

	public constructor(logger: ShiveronLogger) {
		this.logger = logger;
		this.baseUrl = getConfig('LIBRETRANSLATE_URL');
	}

	/**
	 * Translates a string into the target language.
	 *
	 * Pass `sourceLang = "auto"` (the default) to let LibreTranslate detect the
	 * source language automatically. The detection result is then included in the
	 * returned object so callers can show it alongside the translation or use the
	 * confidence score to decide whether to surface the result.
	 *
	 * @param text - The text to translate.
	 * @param targetLang - BCP 47 code of the desired output language (e.g. `"es"`).
	 * @param sourceLang - BCP 47 code of the input language, or `"auto"` to detect.
	 * @returns `translatedText` plus `detectedLanguage` (language code + confidence 0–100) when source was auto-detected, or `null` when source was explicit.
	 */
	public async translate(text: string, targetLang: string, sourceLang = 'auto'): Promise<{ translatedText: string; detectedLanguage: { language: string; confidence: number } | null }> {
		const response = await fetch(`${this.baseUrl}/translate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
		});

		if (!response.ok) {
			const message = `LibreTranslate /translate error ${response.status}: ${await response.text()}`;
			this.logger.error(message);
			throw new Error(message);
		}

		const data = await response.json() as {
			translatedText: string;
			detectedLanguage?: { language: string; confidence: number };
		};

		return {
			translatedText: data.translatedText,
			detectedLanguage: data.detectedLanguage ?? null,
		};
	}

	/**
	 * Detects the language(s) of a text and returns them sorted by descending confidence.
	 * Use the `confidence` field (0–100) to decide whether to act on the result.
	 *
	 * @param text - The text whose language should be identified.
	 */
	public async detect(text: string): Promise<{ language: string; confidence: number }[]> {
		const response = await fetch(`${this.baseUrl}/detect`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ q: text }),
		});

		if (!response.ok) {
			const message = `LibreTranslate /detect error ${response.status}: ${await response.text()}`;
			this.logger.error(message);
			throw new Error(message);
		}

		const data = await response.json() as { language: string; confidence: number }[];
		return data.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Returns the list of languages supported by this LibreTranslate instance.
	 * Useful for populating the language picker in the setup command.
	 */
	public async getLanguages(): Promise<{ code: string; name: string }[]> {
		const response = await fetch(`${this.baseUrl}/languages`);

		if (!response.ok) {
			const message = `LibreTranslate /languages error ${response.status}: ${await response.text()}`;
			this.logger.error(message);
			throw new Error(message);
		}

		return response.json() as Promise<{ code: string; name: string }[]>;
	}

	/**
	 * Returns `true` if the LibreTranslate service is reachable, `false` otherwise.
	 */
	public async isAvailable(): Promise<boolean> {
		try {
			const response = await fetch(`${this.baseUrl}/languages`);
			return response.ok;
		}
		catch {
			return false;
		}
	}
}
