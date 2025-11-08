import { ClientEvents } from 'discord.js';
import { ShiveronClient } from './ShiveronClient.js';

export abstract class BaseEvent<K extends keyof ClientEvents> {
	public abstract readonly name: K;
	public abstract once?: boolean;

	public abstract execute(client: ShiveronClient, ...args: ClientEvents[K]): Promise<void>;
}
