import type { InteractionCollector, MessageCollector, StringSelectMenuInteraction } from 'discord.js';

export class VoiceCollectorManager {
	private messageCollector: Map<string, MessageCollector>;
	private channelControlsCollector: Map<string, InteractionCollector<StringSelectMenuInteraction>>;


	public constructor() {
		this.messageCollector = new Map<string, MessageCollector>();
		this.channelControlsCollector = new Map<string, InteractionCollector<StringSelectMenuInteraction>>();
	}

	public addMessageCollector(channelId: string, collector: MessageCollector): void {
		this.stopMessageCollector(channelId);
		this.messageCollector.set(channelId, collector);
	}

	public stopMessageCollector(channelId: string, reason: string = 'refreshed'): void {
		const collector = this.messageCollector.get(channelId);
		if (collector) {
			collector.stop(reason);
			this.messageCollector.delete(channelId);
		}
	}

	public addChannelControlsCollector(channelId: string, collector: InteractionCollector<StringSelectMenuInteraction>): void {
		this.stopChannelControlsCollector(channelId);
		this.channelControlsCollector.set(channelId, collector);
	}

	public stopChannelControlsCollector(channelId: string, reason: string = 'refreshed'): void {
		const collector = this.channelControlsCollector.get(channelId);
		if (collector) {
			collector.stop(reason);
			this.channelControlsCollector.delete(channelId);
		}
	}
}