import { type Interaction, MessageFlags } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

export default class InterationCreateEvent extends BaseEvent<'interactionCreate'> {
	public readonly name = 'interactionCreate';
	public once = false;

	public async execute(client: ShiveronClient, interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);

			if (!command) {
				client.logger.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			let lang = 'en';
			try {
				if (interaction.guildId) {
					const [currentGuild] = await client.guildSettingsService.createOrGetGuildSettings(interaction.guildId);
					lang = currentGuild.lang;
					console.log(lang);
				}
			}
			catch (error) {
				client.logger.error(`Error fetching guild settings for I18N. Using default localisation 'en' instead : ${error}`);
			}

			const t = (path: string, vars: Record<string, any> = {}) => client.i18n.translate(lang, path, vars);

			try {
				command.execute(client, interaction, t);
				if (interaction.guild) {
					client.logger.debug(`Executed command ${command.data.name} in guild ${interaction.guild.id}`);
				}
			}
			catch (error) {
				client.logger.error(`Failed to process ${this.name} for the command ${interaction.commandName} : ${error}`);
				if (interaction.replied || interaction.deferred) {
					interaction.followUp({ content: t("error.command_failed"), flags: MessageFlags.Ephemeral });
				}
				else {
					interaction.reply({ content: t("error.command_failed"), flags: MessageFlags.Ephemeral });
				}
			}
		}
	}
}