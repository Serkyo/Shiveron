import { type ClientEvents } from 'discord.js';
import { ShiveronClient } from './ShiveronClient.js';

/** Base class for all Discord gateway events. Each event handler must extend this class. */
export abstract class BaseEvent<K extends keyof ClientEvents> {
	public abstract readonly name: K;
	public abstract once?: boolean;

	/**
	 * Handles the incoming Discord event.
	 * @param client - The bot client instance.
	 * @param args - The event arguments as defined by discord.js for the specific event type K.
	 */
	public abstract execute(client: ShiveronClient, ...args: ClientEvents[K]): Promise<void>;
}
