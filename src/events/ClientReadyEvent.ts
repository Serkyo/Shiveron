import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

export default class ClientReadyEvent extends BaseEvent<'clientReady'> {
	public readonly name = 'clientReady';
	public once = true;

	public async execute(client: ShiveronClient): Promise<void> {
		client.logger.info(`Logged in as ${client.user?.tag}.`);
	}
}
