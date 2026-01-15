import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, time, Message, ComponentType, GuildMember, MessageFlags, StringSelectMenuInteraction, ButtonBuilder, ButtonStyle, TextChannel, ChannelSelectMenuBuilder, ChannelType, ChannelSelectMenuInteraction, MessageComponentInteraction, type Interaction } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { GuildSettingsService } from '../../services/GuildSettingsService.js';
import { awaitAuthorizedComponentInteraction } from '../../utils/discord/interactions.js';

export default class SetupCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Configure the bot in your server')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		const commandCaller = interaction.member as GuildMember;

		const [setupEmbed, setupRow] = await this.createSetupMessage(client, interaction);

		const setupMessage = await interaction.editReply({
			embeds: [setupEmbed],
			components: [setupRow],
		});

		await this.attachSetupCollector(client, setupMessage, commandCaller);
	}

	private async createSetupMessage(client: ShiveronClient, interaction: Interaction): Promise<[EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
		const [guildSettings] = await GuildSettingsService.createOrGetGuildSettings(interaction.guildId!);
		const setupEmbed = new EmbedBuilder()
			.setTitle('Guild Setup')
			.setDescription('Welcome to Shiveron\'s setup panel !\nFrom here, you can configure how the bot will behave in your server.\n\nUse the menu below to choose a feature you\'d like to configure. Each section will guide you through it\'s setup process.\n\n*Tip : You can rerun this command anytime to adjust your configuration*')
			.setThumbnail(client.user!.avatarURL())
			.setColor('#46d8ef')
			.addFields(
				{
					name: 'Basic information',
					value: `- Server id : ${interaction.guildId}
                    \n- Owner : ${await interaction.guild!.fetchOwner()}
                    \n- Created on : ${time(interaction.guild!.createdAt)}
                    \n- Member count : ${interaction.guild!.memberCount}`,
				},
			)
			.setFooter({ text: 'Consider supporting me on ko-fi.com/serkyo !', iconURL: 'https://storage.ko-fi.com/cdn/useruploads/50954b12-e332-45c0-afe0-3791b0c16fb2_1285ef3e-fe79-41ec-af90-61f06180146f.png' });

		const currentConfigText = {
			name: 'Current configuration',
			value: '',
		};

		currentConfigText.value += '- **Join messages :** ';
		if (guildSettings.joinChannelId) {
			currentConfigText.value += `Enabled with the message "${guildSettings.joinMessage}"`;
		}
		else {
			currentConfigText.value += 'Disabled';
		}
		currentConfigText.value += '\n- **Leave messages :** ';
		if (guildSettings.leaveChannelId) {
			currentConfigText.value += `Enabled with the message "${guildSettings.leaveMessage}"`;
		}
		else {
			currentConfigText.value += 'Disabled';
		}
		currentConfigText.value += '\n- **Temporary voice calls :** ';
		if (guildSettings.tempChannelId) {
			currentConfigText.value += `Enabled in ${await interaction.guild!.channels.fetch(guildSettings.tempChannelId)}`;
		}
		else {
			currentConfigText.value += 'Disabled';
		}
		currentConfigText.value += '\n- **Maximum number of warnings :** ';
		if (guildSettings.nbWarningsMax) {
			currentConfigText.value += guildSettings.nbWarningsMax;
		}
		else {
			currentConfigText.value += 'None';
		}
		setupEmbed.addFields(currentConfigText);

		const setupSelect = new StringSelectMenuBuilder()
			.setCustomId('setup')
			.setPlaceholder('Choose an action')
			.setMinValues(0)
			.setMaxValues(1)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Departure Messages')
					.setDescription('Configure the custom messages sent by the bot when someone joins or leaves your server')
					.setValue('departure'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Temporary Voice Channels')
					.setDescription('Configure the temporary voice channels')
					.setValue('temp_voice'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Maximum Amount of Warnings')
					.setDescription('Configure the auto-banning feature after an user reaches a defined amount of warnings')
					.setValue('max_warnings'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Exit Setup')
					.setDescription('End the setup process')
					.setValue('exit')
			);

		const setupRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(setupSelect);

		return [setupEmbed, setupRow];
	}

	private async attachSetupCollector(client: ShiveronClient, message: Message, commandCaller: GuildMember): Promise<void> {
		const setupCollector = message.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: i => i.user.id == commandCaller.id,
			time: 60000,
		});

		setupCollector.on('end', async (_collected, reason) => {
			await message.edit({ components: [] });
			if (reason == 'time') {
				await message.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
		});

		setupCollector.on('ignore', async interaction => {
			await interaction.reply({ content: `${interaction.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
		});

		setupCollector.on('collect', async interaction => {
			setupCollector.stop('refresh');

			if (interaction.values.length > 0) {
				await interaction.deferReply();

				switch (interaction.values[0]) {
				case 'departure':
					await this.processDepartureSetup(interaction, commandCaller);
					break;
				case 'temp_voice':
					await this.processTempVoiceSetup(interaction, commandCaller);
					break;
				case 'max_warnings':
					await this.processMaxWarningsSetup(interaction, commandCaller);
					break;
				}
			}

			if (interaction.values[0] != 'exit') {
				await this.refreshSetup(client, interaction, commandCaller);
			}
			else {
				await interaction.editReply({ content: "Stopped the setup panel" });
			}
		});
	}

	private async processDepartureSetup(interaction: StringSelectMenuInteraction, commandCaller: GuildMember): Promise<void> {
		if (await GuildSettingsService.isDepartureOn(interaction.guildId!)) {
			const configureButton = new ButtonBuilder()
				.setCustomId('configure')
				.setLabel('Configure')
				.setEmoji('🔧')
				.setStyle(ButtonStyle.Primary);
			const turnOffButton = new ButtonBuilder()
				.setCustomId('off')
				.setLabel('Off')
				.setEmoji('❌')
				.setStyle(ButtonStyle.Danger);
			const managementRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([configureButton, turnOffButton]);

				const managementMessage = await interaction.editReply({ content: 'Do you want to configure departure messages or turn them off ?', components: [managementRow] });

			const managementResult = await awaitAuthorizedComponentInteraction(managementMessage, commandCaller.id, ComponentType.Button);

			if (!managementResult) {
				managementMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				await managementResult.deferReply();

				if (managementResult.customId == 'off') {
					const updatedSettings = await GuildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						joinChannelId: null,
						joinMessage: null,
						leaveChannelId: null,
						leaveMessage: null,
					});

					if (updatedSettings != null) {
						managementResult.editReply({ content: 'Successfully disabled departure messages.' });
					}
					else {
						managementResult.editReply({ content: 'An error occured while tying to disable departure messages. Please try again later.' });
					}
				}
				else {
					await this.configureDepartureMessages(managementResult, commandCaller);
				}
			}
		}
		else {
			await this.configureDepartureMessages(interaction, commandCaller);
		}
	}
 
	private async processTempVoiceSetup(interaction: StringSelectMenuInteraction, commandCaller: GuildMember): Promise<void> {
		if (await GuildSettingsService.isTempVoiceOn(interaction.guildId!)) {
			const configureButton = new ButtonBuilder()
				.setCustomId('configure')
				.setLabel('Configure')
				.setEmoji('🔧')
				.setStyle(ButtonStyle.Primary);
			const turnOffButton = new ButtonBuilder()
				.setCustomId('off')
				.setLabel('Off')
				.setEmoji('❌')
				.setStyle(ButtonStyle.Danger);
			const managementRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([configureButton, turnOffButton]);
			
			const managementMessage = await interaction.editReply({ content: 'Do you want to configure temporary channels or turn them off ?', components: [managementRow] });

			const managementResult = await awaitAuthorizedComponentInteraction(managementMessage, commandCaller.id, ComponentType.Button);

			if (!managementResult) {
				managementMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				await managementResult.deferReply();

				if (managementResult.customId == 'off') {
					const updatedSettings = await GuildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						tempChannelId: null
					});

					if (updatedSettings != null) {
						managementResult.editReply({ content: 'Successfully disabled temporary channels.' });
					}
					else {
						managementResult.editReply({ content: 'An error occured while tying to disable temporary channels. Please try again later.' });
					}
				}
				else {
					await this.configureTempVoiceChannels(managementResult, commandCaller);
				}
			}
		}
		else {
			await this.configureTempVoiceChannels(interaction, commandCaller);
		}
	}

	private async processMaxWarningsSetup(interaction: StringSelectMenuInteraction, commandCaller: GuildMember): Promise<void> {
		if (await GuildSettingsService.isMaxWarningsOn(interaction.guildId!)) {
			const configureButton = new ButtonBuilder()
				.setCustomId('configure')
				.setLabel('Configure')
				.setEmoji('🔧')
				.setStyle(ButtonStyle.Primary);
			const turnOffButton = new ButtonBuilder()
				.setCustomId('off')
				.setLabel('Off')
				.setEmoji('❌')
				.setStyle(ButtonStyle.Danger);
			const managementRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents([configureButton, turnOffButton]);
			
			const managementMessage = await interaction.editReply({ content: 'Do you want to configure the auto-ban feature upon reaching a set amount of warnings or turn it off ?', components: [managementRow] });

			const managementResult = await awaitAuthorizedComponentInteraction(managementMessage, commandCaller.id, ComponentType.Button);

			if (!managementResult) {
				managementMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				await managementResult.deferReply();

				if (managementResult.customId == 'off') {
					const updatedSettings = await GuildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						nbWarningsMax: null
					});

					if (updatedSettings != null) {
						managementResult.editReply({ content: 'Successfully disabled the auto-ban feature upon reaching a set amount of warnings.' });
					}
					else {
						managementResult.editReply({ content: 'An error occured while tying to disable the auto-ban feature upon reaching a set amount of warnings. Please try again later.' });
					}
				}
				else {
					await this.configureMaxWarnings(managementResult, commandCaller);
				}
			}
		}
		else {
			await this.configureMaxWarnings(interaction, commandCaller);
		}
	}

	private async configureDepartureMessages(interaction: MessageComponentInteraction, commandCaller: GuildMember): Promise<void> {
		const joinButton = new ButtonBuilder()
			.setCustomId('join')
			.setLabel('Join')
			.setEmoji('📥')
			.setStyle(ButtonStyle.Success);
		const leaveButton = new ButtonBuilder()
			.setCustomId('leave')
			.setLabel('Leave')
			.setEmoji('📤')
			.setStyle(ButtonStyle.Danger);
		const departureRow = new ActionRowBuilder<ButtonBuilder>()
			.addComponents([joinButton, leaveButton]);

		const departureMessage = await interaction.editReply({ content: 'Do you want to edit the join or the leave message ?', components: [departureRow] });

		const departurePressed = await awaitAuthorizedComponentInteraction(departureMessage, commandCaller.id, ComponentType.Button);

		if (!departurePressed) {
			await departureMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
		}
		else {
			await departurePressed.deferReply();

			const channelSelection = new ChannelSelectMenuBuilder()
				.setCustomId('departure_channel')
				.setMinValues(0)
				.setMaxValues(1)
				.setPlaceholder('Choose a channel')
				.addChannelTypes(ChannelType.GuildText);

			const channelSelectionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
				.addComponents(channelSelection);

			const channelSelectionMessage = await departurePressed.editReply({ content: 'Select the channel where you want to send the departure messages', components: [channelSelectionRow] });

			const channelSelected = await awaitAuthorizedComponentInteraction(channelSelectionMessage, commandCaller.id, ComponentType.ChannelSelect) as ChannelSelectMenuInteraction;

			if (!channelSelected) {
				await departureMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				await channelSelected.deferReply();

				const channel = interaction.channel;

			    if (channel instanceof TextChannel) {
					const newMessageQuestion = await channelSelected.editReply({ content: `Enter the new ${departurePressed.customId} message you want to use. You can use the following syntax :\n- \${user} will be replaced with the name of the affected member\n- \${server} will be replaced with your server's name\n- \${memberCount} will be replaced with the new amount of member in your server` });

					const collectedMessages = await channel.awaitMessages({
						time: 60000,
						max: 1,
						filter: message => commandCaller.id == message.author.id,
					});

					const newMessage = collectedMessages.first();

					if (collectedMessages.size == 0) {
						await newMessageQuestion.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
					}
					else if (departurePressed.customId == 'join') {
						const updatedSettings = await GuildSettingsService.updateGuildSettings({
							guildId: interaction.guildId!,
							joinChannelId: channelSelected.values[0]!,
							joinMessage: newMessage!.content,
						});
						
						if (updatedSettings != null) {
							await newMessage!.reply({ content: `The join message has successfully been changed to : ${newMessage!.content}` });
						}
						else {
							await newMessage!.reply({ content: 'An error occured while tying to enable the leave message. Please try again later.' });
						}
					}
					else {
						const updatedSettings = await GuildSettingsService.updateGuildSettings({
							guildId: interaction.guildId!,
							leaveChannelId: channelSelected.values[0]!,
							leaveMessage: newMessage!.content,
						});

						if (updatedSettings != null) {
							await newMessage!.reply({ content: `The leave message has successfully been changed to : ${newMessage!.content}` });
						}
						else {
							await newMessage!.reply({ content: 'An error occured while tying to enable the leave message. Please try again later.' });
						}
					}
				}
			}
		}
	}

	private async configureTempVoiceChannels(interaction: MessageComponentInteraction, commandCaller: GuildMember): Promise<void> {
		const channelSelection = new ChannelSelectMenuBuilder()
				.setCustomId('departure_channel')
				.setMinValues(0)
				.setMaxValues(1)
				.setPlaceholder('Choose a channel')
				.addChannelTypes(ChannelType.GuildVoice);

		const channelSelectionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
			.addComponents(channelSelection);

		const channelSelectionMessage = await interaction.editReply({ content: 'Select the channel that will be used to create temporary voice channels', components: [channelSelectionRow] });

		const channelSelected = await awaitAuthorizedComponentInteraction(channelSelectionMessage, commandCaller.id, ComponentType.ChannelSelect) as ChannelSelectMenuInteraction;

		if (!channelSelected) {
			await channelSelectionMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
		}
		else {
			await channelSelected.deferReply();

			const updatedSettings = await GuildSettingsService.updateGuildSettings({
				guildId: interaction.guildId!,
				tempChannelId: channelSelected.values[0]!
			});

			if (updatedSettings != null) {
				await channelSelected.editReply({ content: `The temporary voice channel creation has been set to ${channelSelected.values[0]!}` });
			}
			else {
				await channelSelected!.editReply({ content: 'An error occured while tying to enable temporary voice channels. Please try again later.' });
			}
		}
	}

	private async configureMaxWarnings(interaction: MessageComponentInteraction, commandCaller: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof TextChannel) {
			const newNbWarningsQuestion = await interaction.editReply({ content: 'Enter the number of warnings that needs to be reached for the auto-ban feature to trigger' });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => commandCaller.id == message.author.id,
			});

			const newNbWarningsStr = collectedMessages.first();

			if (collectedMessages.size == 0) {
				await newNbWarningsQuestion.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				if (!isNaN(Number(newNbWarningsStr))) {
					const newNbWarnings = parseFloat(newNbWarningsStr!.content);

					const updatedSettings = await GuildSettingsService.updateGuildSettings({
						guildId: interaction.guildId!,
						nbWarningsMax: newNbWarnings
					});

					if (updatedSettings != null) {
						await newNbWarningsStr!.reply({ content: `The number of warnings that needs to be reached for the auto-ban feature to trigger has been set to ${newNbWarnings}` });
					}
					else {
						await newNbWarningsStr!.reply({ content: 'An error occured while tying to enable the auto-ban feature upon reaching a set amount of warnings. Please try again later.' });
					}
				}
			}
		}
	}

	private async refreshSetup(client: ShiveronClient, interaction: StringSelectMenuInteraction, commandCaller: GuildMember): Promise<void> {
		const [setupEmbed, setupRow] = await this.createSetupMessage(client, interaction);
		const channel = interaction.channel;

		if (channel instanceof TextChannel) {
			const setupMessage = await channel.send({
				embeds: [setupEmbed],
				components: [setupRow],
			});

			await this.attachSetupCollector(client, setupMessage, commandCaller);
		}
	}
}