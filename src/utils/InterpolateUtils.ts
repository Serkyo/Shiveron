export class InterpolateUtils {
	public static interpolate(template: string, data: Record<string, any>): string {
		let result = template;
		for (const [arg, val] of Object.entries(data)) {
			const pattern = new RegExp(`\\$\\{${arg}\\}`, 'g');
			result = result.replace(pattern, String(val));
		}
		return result;
	}
}