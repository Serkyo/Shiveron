import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, time, Message, ComponentType, GuildMember, MessageFlags, StringSelectMenuInteraction, ButtonBuilder, ButtonStyle, TextChannel, ChannelSelectMenuBuilder, ChannelType, ChannelSelectMenuInteraction, MessageComponentInteraction, type Interaction } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { awaitAuthorizedComponentInteraction } from '../../utils/discord/interactions.js';

export default class SetupCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Configure the bot in your server')
		.setDescriptionLocalizations({
			'fr': 'Configurez le bot dans votre serveur'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply();

		const commandCaller = interaction.member as GuildMember;

		const [setupEmbed, setupRow] = await this.createSetupMessage(client, interaction, t);

		const setupMessage = await interaction.editReply({
			embeds: [setupEmbed],
			components: [setupRow],
		});

		this.attachSetupCollector(client, t, setupMessage, commandCaller);
	}

	private async createSetupMessage(client: ShiveronClient, interaction: Interaction, t: (path: string, vars?: Record<string, any>) => string): Promise<[EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
		const [guildSettings] = await client.guildSettingsService.createOrGetGuildSettings(interaction.guildId!);
		const setupEmbed = new EmbedBuilder()
			.setTitle(t('command.setup.embed.title'))
			.setDescription(t('command.setup.embed.description'))
			.setThumbnail(client.user!.avatarURL())
			.setColor('#46d8ef')
			.addFields(
				{
					name: t('command.setup.embed.fields.basic_info.name'),
					value: t('command.setup.embed.fields.basic_info.value', { guildId: interaction.guildId, owner: await interaction.guild!.fetchOwner(), creationDate: time(interaction.guild!.createdAt), memberCount: interaction.guild!.memberCount}),
				},
			)
			.setFooter({ text: t('command.setup.embed.footer'), iconURL: 'https://storage.ko-fi.com/cdn/useruploads/50954b12-e332-45c0-afe0-3791b0c16fb2_1285ef3e-fe79-41ec-af90-61f06180146f.png' });

		const currentConfigText = {
			name: t('command.setup.embed.fields.current_config.name'),
			value: '',
		};

		currentConfigText.value += t('command.setup.embed.fields.current_config.join_message');
		if (guildSettings.joinChannelId) {
			currentConfigText.value += t('command.setup.embed.fields.current_config.join_message_enabled', { message: guildSettings.joinMessage });
		}
		else {
			currentConfigText.value += t('command.setup.embed.fields.current_config.disabled');
		}
		currentConfigText.value += t('command.setup.embed.fields.current_config.leave_message');
		if (guildSettings.leaveChannelId) {
			currentConfigText.value += t('command.setup.embed.fields.current_config.leave_message_enabled', { message: guildSettings.leaveMessage });
		}
		else {
			currentConfigText.value += t('command.setup.embed.fields.current_config.disabled');
		}
		currentConfigText.value += t('command.setup.embed.fields.current_config.temp_voice');
		if (guildSettings.tempChannelId) {
			currentConfigText.value += t('command.setup.embed.fields.current_config.temp_voice_enabled', { channel: await interaction.guild!.channels.fetch(guildSettings.tempChannelId) });
		}
		else {
			currentConfigText.value += t('command.setup.embed.fields.current_config.disabled');
		}
		currentConfigText.value += t('command.setup.embed.fields.current_config.max_warnings');
		if (guildSettings.maxWarnings) {
			currentConfigText.value += t('command.setup.embed.fields.current_config.max_warnings_enabled', { amount: guildSettings.maxWarnings });
		}
		else {
			currentConfigText.value += t('command.setup.embed.fields.current_config.disabled');
		}
		currentConfigText.value += t('command.setup.embed.fields.current_config.lang', { language: guildSettings.lang });

		setupEmbed.addFields(currentConfigText);

		const setupSelect = new StringSelectMenuBuilder()
			.setCustomId('setup')
			.setPlaceholder(t('misc.generic_selection'))
			.setMinValues(0)
			.setMaxValues(1)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(t('command.setup.select_menu.departure_message.label'))
					.setDescription(t('command.setup.select_menu.departure_message.description'))
					.setValue('departure'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('command.setup.select_menu.temp_voice.label'))
					.setDescription(t('command.setup.select_menu.temp_voice.description'))
					.setValue('temp_voice'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('command.setup.select_menu.max_warnings.label'))
					.setDescription(t('command.setup.select_menu.max_warnings.description'))
					.setValue('max_warnings'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('command.setup.select_menu.lang.label'))
					.setDescription(t('command.setup.select_menu.lang.description'))
					.setValue('lang'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('command.setup.select_menu.exit.label'))
					.setDescription(t('command.setup.select_menu.exit.description'))
					.setValue('exit'),
			);

		const setupRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(setupSelect);

		return [setupEmbed, setupRow];
	}

	private async attachSetupCollector(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, message: Message, commandCaller: GuildMember): Promise<void> {
		const setupCollector = message.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: i => i.user.id == commandCaller.id,
			time: 60000,
		});

		setupCollector.on('end', async (_collected, reason) => {
			message.edit({ components: [] });
			if (reason == 'time') {
				message.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
		});

		setupCollector.on('ignore', async interaction => {
			interaction.reply({ content: t('misc.interaction_forbidden', { user: interaction.user }), flags: MessageFlags.Ephemeral });
		});

		setupCollector.on('collect', async interaction => {
			setupCollector.stop('refresh');

			if (interaction.values.length > 0) {
				await interaction.deferReply();

				switch (interaction.values[0]) {
				case 'departure':
					await this.processDepartureSetup(client, interaction, t, commandCaller);
					break;
				case 'temp_voice':
					await this.processTempVoiceSetup(client, interaction, t, commandCaller);
					break;
				case 'max_warnings':
					await this.processMaxWarningsSetup(client, interaction, t, commandCaller);
					break;
				case 'lang':
					await this.configureLanguage(client, interaction, t, commandCaller);
					break;
				}
			}

			if (interaction.values[0] != 'exit') {
				this.refreshSetup(client, interaction, t, commandCaller);
			}
			else {
				interaction.editReply({ content: t('command.setup.result.success_exit') });
			}
		});
	}

	private async processDepartureSetup(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		if (await client.guildSettingsService.isDepartureOn(interaction.guildId!)) {
			const configureButton = new ButtonBuilder()
				.setCustomId('configure')
				.setLabel(t('command.setup.button.configure'))
				.setEmoji('🔧')
				.setStyle(ButtonStyle.Primary);
			const turnOffButton = new ButtonBuilder()
				.setCustomId('off')
				.setLabel(t('command.setup.button.off'))
				.setEmoji('❌')
				.setStyle(ButtonStyle.Danger);
			const managementRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([configureButton, turnOffButton]);

			const managementMessage = await interaction.editReply({ content: t('command.setup.prompt.feature_action', { feature: t('command.setup.feature.departure_message') }), components: [managementRow] });

			const managementResult = await awaitAuthorizedComponentInteraction(managementMessage, commandCaller.id, ComponentType.Button);

			if (!managementResult) {
				managementMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 } ) });
			}
			else {
				await managementResult.deferReply();

				if (managementResult.customId == 'off') {
					const updatedSettings = await client.guildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						joinChannelId: null,
						joinMessage: null,
						leaveChannelId: null,
						leaveMessage: null,
					});

					if (updatedSettings) {
						managementResult.editReply({ content: t('command.setup.result.success_disable', { feature: t('command.setup.feature.departure_message') }) });
					}
					else {
						managementResult.editReply({ content: t('command.setup.result.error_generic', { feature: t('command.setup.feature.departure_message') }) });
					}
				}
				else {
					await this.configureDepartureMessages(client, managementResult, t, commandCaller);
				}
			}
		}
		else {
			await this.configureDepartureMessages(client, interaction, t, commandCaller);
		}
	}

	private async processTempVoiceSetup(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		if (await client.guildSettingsService.isTempVoiceOn(interaction.guildId!)) {
			const configureButton = new ButtonBuilder()
				.setCustomId('configure')
				.setLabel(t('command.setup.button.configure'))
				.setEmoji('🔧')
				.setStyle(ButtonStyle.Primary);
			const turnOffButton = new ButtonBuilder()
				.setCustomId('off')
				.setLabel(t('command.setup.button.off'))
				.setEmoji('❌')
				.setStyle(ButtonStyle.Danger);
			const managementRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([configureButton, turnOffButton]);

			const managementMessage = await interaction.editReply({ content: t('command.setup.prompt.feature_action', { feature: t('command.setup.feature.temp_voice') }), components: [managementRow] });

			const managementResult = await awaitAuthorizedComponentInteraction(managementMessage, commandCaller.id, ComponentType.Button);

			if (!managementResult) {
				managementMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				await managementResult.deferReply();

				if (managementResult.customId == 'off') {
					const updatedSettings = await client.guildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						tempChannelId: null,
					});

					if (updatedSettings) {
						managementResult.editReply({ content: t('command.setup.result.success_disable', { feature: t('command.setup.feature.temp_voice') }) });
					}
					else {
						managementResult.editReply({ content: t('command.setup.error_generic', { feature: t('command.setup.feature.temp_voice') }) });
					}
				}
				else {
					await this.configureTempVoiceChannels(client, managementResult, t, commandCaller);
				}
			}
		}
		else {
			await this.configureTempVoiceChannels(client, interaction, t, commandCaller);
		}
	}

	private async processMaxWarningsSetup(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		if (await client.guildSettingsService.isMaxWarningsOn(interaction.guildId!)) {
			const configureButton = new ButtonBuilder()
				.setCustomId('configure')
				.setLabel(t('command.setup.button.configure'))
				.setEmoji('🔧')
				.setStyle(ButtonStyle.Primary);
			const turnOffButton = new ButtonBuilder()
				.setCustomId('off')
				.setLabel(t('command.setup.button.off'))
				.setEmoji('❌')
				.setStyle(ButtonStyle.Danger);
			const managementRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([configureButton, turnOffButton]);

			const managementMessage = await interaction.editReply({ content: t('command.setup.prompt.feature_action', { feature: t('command.setup.feature.max_warnings') }), components: [managementRow] });

			const managementResult = await awaitAuthorizedComponentInteraction(managementMessage, commandCaller.id, ComponentType.Button);

			if (!managementResult) {
				managementMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				await managementResult.deferReply();

				if (managementResult.customId == 'off') {
					const updatedSettings = await client.guildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						maxWarnings: null,
					});

					if (updatedSettings) {
						managementResult.editReply({ content: t('command.setup.result.success_disable', { feature: t('command.setup.feature.max_warnings') }) });
					}
					else {
						managementResult.editReply({ content: t('command.setup.error_generic', { feature: t('command.setup.feature.max_warnings') }) });
					}
				}
				else {
					await this.configureMaxWarnings(client, managementResult, t, commandCaller);
				}
			}
		}
		else {
			await this.configureMaxWarnings(client, interaction, t, commandCaller);
		}
	}

	private async configureLanguage(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		const languageSelect = new StringSelectMenuBuilder()
			.setCustomId('language')
			.setPlaceholder(t('misc.generic_selection'))
			.setMinValues(0)
			.setMaxValues(1)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('English')
					.setValue('en')
					.setEmoji('🇺🇸'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Français')
					.setValue('fr')
					.setEmoji('🇫🇷'),
			);

		const languageRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(languageSelect);

		const languageMessage = await interaction.editReply({ content: t('command.setup.prompt.select_language'), components: [languageRow] });

		const languageSelected = await awaitAuthorizedComponentInteraction(languageMessage, commandCaller.id, ComponentType.StringSelect) as StringSelectMenuInteraction;

		if (!languageSelected) {
			languageMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
		}
		else {
			await languageSelected.deferReply();

			const updatedSettings = await client.guildSettingsService.updateGuildSettings({
				guildId: interaction.guildId!,
				lang: languageSelected.values[0]!,
			});

			if (updatedSettings) {
				languageSelected.editReply({ content: t('command.setup.result.success_enable_lang', { language: languageSelected.values[0]! }) });
			}
			else {
				languageSelected.editReply({ content: t('command.setup.result.error_generic', { action: t('command.setup.feature.lang') }) });
			}
		}
	}

	private async configureDepartureMessages(client: ShiveronClient, interaction: MessageComponentInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		const joinButton = new ButtonBuilder()
			.setCustomId('join')
			.setLabel(t('command.setup.button.join'))
			.setEmoji('📥')
			.setStyle(ButtonStyle.Success);
		const leaveButton = new ButtonBuilder()
			.setCustomId('leave')
			.setLabel(t('command.setup.button.leave'))
			.setEmoji('📤')
			.setStyle(ButtonStyle.Danger);
		const departureRow = new ActionRowBuilder<ButtonBuilder>()
			.addComponents([joinButton, leaveButton]);

		const departureMessage = await interaction.editReply({ content: t('command.setup.prompt.edit_type'), components: [departureRow] });

		const departurePressed = await awaitAuthorizedComponentInteraction(departureMessage, commandCaller.id, ComponentType.Button);

		if (!departurePressed) {
			departureMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
		}
		else {
			await departurePressed.deferReply();

			const action = departurePressed.customId;
			const channelSelection = new ChannelSelectMenuBuilder()
				.setCustomId('departure_channel')
				.setMinValues(0)
				.setMaxValues(1)
				.setPlaceholder(t('misc.channel_selection'))
				.addChannelTypes(ChannelType.GuildText);

			const channelSelectionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
				.addComponents(channelSelection);

			const channelSelectionMessage = await departurePressed.editReply({ content: t('command.setup.prompt.select_channel', { action: t('command.setup.button.' + action) }), components: [channelSelectionRow] });

			const channelSelected = await awaitAuthorizedComponentInteraction(channelSelectionMessage, commandCaller.id, ComponentType.ChannelSelect) as ChannelSelectMenuInteraction;

			if (!channelSelected) {
				departureMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				await channelSelected.deferReply();

				const channel = interaction.channel;

			    if (channel instanceof TextChannel) {
					const newMessageQuestion = await channelSelected.editReply({ content: t('command.setup.prompt.enter_message', { action: t('command.setup.button.' + action) }) });

					const collectedMessages = await channel.awaitMessages({
						time: 60000,
						max: 1,
						filter: message => commandCaller.id == message.author.id,
					});

					const newMessage = collectedMessages.first();

					if (collectedMessages.size == 0) {
						newMessageQuestion.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
					}
					else if (action == 'join') {
						const updatedSettings = await client.guildSettingsService.updateGuildSettings({
							guildId: interaction.guildId!,
							joinChannelId: channelSelected.values[0]!,
							joinMessage: newMessage!.content,
						});

						if (updatedSettings) {
							newMessage!.reply({ content: t('command.setup.result.success_enable_departure', { action: t('command.setup.button.' + action), message: newMessage!.content }) });
						}
						else {
							newMessage!.reply({ content: t('command.setup.result.error_generic', { action: t('command.setup.feature.departure_message') }) });
						}
					}
					else {
						const updatedSettings = await client.guildSettingsService.updateGuildSettings({
							guildId: interaction.guildId!,
							leaveChannelId: channelSelected.values[0]!,
							leaveMessage: newMessage!.content,
						});

						if (updatedSettings) {
							newMessage!.reply({ content: t('command.setup.result.success_enable_departure', { action: t('command.setup.button.' + action), message: newMessage!.content }) });
						}
						else {
							newMessage!.reply({ content: t('command.setup.result.error_generic', { action: t('command.setup.feature.departure_message') }) });
						}
					}
				}
			}
		}
	}

	private async configureTempVoiceChannels(client: ShiveronClient, interaction: MessageComponentInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		const channelSelection = new ChannelSelectMenuBuilder()
			.setCustomId('departure_channel')
			.setMinValues(0)
			.setMaxValues(1)
			.setPlaceholder(t('misc.channel_selection'))
			.addChannelTypes(ChannelType.GuildVoice);

		const channelSelectionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
			.addComponents(channelSelection);

		const channelSelectionMessage = await interaction.editReply({ content: t('command.setup.prompt.temp_voice_channel'), components: [channelSelectionRow] });

		const channelSelected = await awaitAuthorizedComponentInteraction(channelSelectionMessage, commandCaller.id, ComponentType.ChannelSelect) as ChannelSelectMenuInteraction;

		if (!channelSelected) {
			await channelSelectionMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
		}
		else {
			await channelSelected.deferReply();

			const updatedSettings = await client.guildSettingsService.updateGuildSettings({
				guildId: interaction.guildId!,
				tempChannelId: channelSelected.values[0]!,
			});

			if (updatedSettings) {
				await channelSelected.editReply({ content: t('command.setup.result.success_enable_temp_voice', { channel: channelSelected.values[0]! }) });
			}
			else {
				await channelSelected!.editReply({ content: t('command.setup.result.error_generic', { action: t('command.setup.button.temp_voice') }) });
			}
		}
	}

	private async configureMaxWarnings(client: ShiveronClient, interaction: MessageComponentInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof TextChannel) {
			const newNbWarningsQuestion = await interaction.editReply({ content: t('command.setup.prompt.auto_ban_count') });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => commandCaller.id == message.author.id,
			});

			const newNbWarningsStr = collectedMessages.first();

			if (collectedMessages.size == 0) {
				await newNbWarningsQuestion.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else if (!isNaN(Number(newNbWarningsStr))) {
				const newNbWarnings = parseFloat(newNbWarningsStr!.content);

				const updatedSettings = await client.guildSettingsService.updateGuildSettings({
					guildId: interaction.guildId!,
					maxWarnings: newNbWarnings,
				});

				if (updatedSettings) {
					await newNbWarningsStr!.reply({ content: t('command.setup.result.success_enable_max_warnings', { amount: newNbWarnings }) });
				}
				else {
					await newNbWarningsStr!.reply({ content: t('command.setup.result.error_generic', { action: t('command.setup.button.max_warnings') }) });
				}
			}
		}
	}

	private async refreshSetup(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, commandCaller: GuildMember): Promise<void> {
		const [setupEmbed, setupRow] = await this.createSetupMessage(client, interaction, t);
		const channel = interaction.channel;

		if (channel instanceof TextChannel) {
			const setupMessage = await channel.send({
				embeds: [setupEmbed],
				components: [setupRow],
			});

			await this.attachSetupCollector(client, t, setupMessage, commandCaller);
		}
	}
}