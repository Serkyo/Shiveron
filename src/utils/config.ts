import fs from 'fs';

export function getConfig(configName: string) {
	try {
		return fs.readFileSync(`/run/secrets/${configName.toLowerCase()}`, 'utf-8').trim();
	}
	catch (error) {
		return process.env[configName] ?? '';
	}
}