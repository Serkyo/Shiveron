import { type Interaction, MessageFlags } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';

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
				command.execute(client, interaction);
				if (interaction.guild) {
					ShiveronLogger.debug(`Executed command ${command.data.name} in guild ${interaction.guild.id}`);
				}
			}
			catch (error) {
				ShiveronLogger.error(`Failed to process ${this.name} for the command ${interaction.commandName} : ${error}`);
				if (interaction.replied || interaction.deferred) {
					interaction.followUp({ content: 'There was an error while executing this command !', flags: MessageFlags.Ephemeral });
				}
				else {
					interaction.reply({ content: 'There was an error while executing this command !', flags: MessageFlags.Ephemeral });
				}
			}
		}
	}
}