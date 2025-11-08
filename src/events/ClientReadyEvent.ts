import { BaseEvent } from "../core/BaseEvent.js";
import { ShiveronClient } from "../core/ShiveronClient.js";
import { ShiveronLogger } from "../utils/ShiveronLogger.js";

export default class ClientReadyEvent extends BaseEvent<'clientReady'> {
	public readonly name = 'clientReady';
	public once = true;

	public async execute(client: ShiveronClient): Promise<void> {
		ShiveronLogger.info(`Logged in as ${client.user?.tag}.`);
	}
}
