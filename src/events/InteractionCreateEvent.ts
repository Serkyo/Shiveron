import { Interaction, MessageFlags } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';

export default class InterationCreateEvent extends BaseEvent<'interactionCreate'> {
	public readonly name = 'interactionCreate';
	public once = false;

	public async execute(client: ShiveronClient, interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);

			if (!command) {
				ShiveronLogger.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(client, interaction);
			}
			catch (error) {
				ShiveronLogger.error(`${error}`);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command !', flags: MessageFlags.Ephemeral });
				}
				else {
					await interaction.reply({ content: 'There was an error while executing this command !', flags: MessageFlags.Ephemeral });
				}
			}
		}
	}
}