import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

/** Fires once when the bot successfully connects to Discord and is ready to receive events. */
export default class ClientReadyEvent extends BaseEvent<'clientReady'> {
	public readonly name = 'clientReady';
	public once = true;

	/**
	 * Logs the bot's tag to confirm a successful login.
	 * @param client - The bot client instance, used to access `client.user.tag`.
	 */
	public async execute(client: ShiveronClient): Promise<void> {
		client.logger.info(`Logged in as ${client.user?.tag}.`);
	}
}
