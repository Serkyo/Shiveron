import type { MessageCollector } from 'discord.js';

export default class VoiceCollectorManager {
	private static instance: VoiceCollectorManager;
	private collectors: Map<string, MessageCollector>;

	private constructor() {
		this.collectors = new Map<string, MessageCollector>();
	}

	public static getInstance(): VoiceCollectorManager {
		if (!VoiceCollectorManager.instance) {
			VoiceCollectorManager.instance = new VoiceCollectorManager();
		}
		return VoiceCollectorManager.instance;
	}

	public add(channelId: string, collector: MessageCollector): void {
		this.stop(channelId);
		this.collectors.set(channelId, collector);
	}

	public stop(channelId: string, reason: string = 'refreshed'): void {
		const collector = this.collectors.get(channelId);
		if (collector) {
			collector.stop(reason);
			this.collectors.delete(channelId);
		}
	}
}