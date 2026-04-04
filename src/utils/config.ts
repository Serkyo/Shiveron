import fs from 'fs';

/**
 * Reads a configuration value from a Docker secret file, falling back to an environment variable.
 * @param configName - The name of the config key (e.g., `"DB_PASS"`). Looked up as `/run/secrets/<lowercase>` first, then `process.env[configName]`.
 * @returns The trimmed secret value, the env var value, or an empty string if neither exists.
 */
export function getConfig(configName: string) {
	try {
		return fs.readFileSync(`/run/secrets/${configName.toLowerCase()}`, 'utf-8').trim();
	}
	catch (error) {
		return process.env[configName] ?? '';
	}
}
