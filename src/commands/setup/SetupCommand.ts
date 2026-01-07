// import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, time, Message, ComponentType, GuildMember, MessageFlags, StringSelectMenuInteraction, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
// import { BaseCommand } from '../../core/BaseCommand.js';
// import { ShiveronClient } from '../../core/ShiveronClient.js';
// import { GuildSettingsService } from '../../services/GuildSettingsService.js';
// import { MessageUtils } from '../../utils/discord/MessageUtils.js';

// export default class SetupCommand extends BaseCommand {
// 	public data = new SlashCommandBuilder()
// 		.setName('setup')
// 		.setDescription('Configure the bot in your server')
// 		.setContexts(InteractionContextType.Guild)
// 		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// 	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
// 		await interaction.deferReply();

// 		const commandCaller = interaction.member as GuildMember;

// 		const [setupEmbed, setupRow] = await this.createSetupMessage(client, interaction);

// 		const setupMessage = await interaction.editReply({
// 			embeds: [setupEmbed],
// 			components: [setupRow],
// 		});

//         await this.attachSetupCollector(setupMessage, commandCaller);
// 	}

// 	private async createSetupMessage(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<[EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
// 		const [guildSettings] = await GuildSettingsService.createOrGetGuildSettings(interaction.guildId!);
// 		const setupEmbed = new EmbedBuilder()
// 			.setTitle('Guild Setup')
// 			.setDescription('Welcome to Shiveron\'s setup panel !\nFrom here, you can configure how the bot will behave in your server.\n\nUse the menu below to choose a feature you\'d like to configure. Each section will guide you through it\'s setup process.\n\n*Tip : You can rerun this command anytime to adjust your configuration*')
// 			.setThumbnail(client.user!.avatarURL())
// 			.setColor('#46d8ef')
// 			.addFields(
// 				{
// 					name: 'Basic information',
// 					value: `- Server id : ${interaction.guildId}
//                     \n- Owner : ${await interaction.guild!.fetchOwner()}
//                     \n- Created on : ${time(interaction.guild!.createdAt)}
//                     \n- Member count : ${interaction.guild!.memberCount}`,
// 				},
// 			)
// 			.setFooter({ text: 'Consider supporting me on ko-fi.com/serkyo !', iconURL: 'https://storage.ko-fi.com/cdn/useruploads/50954b12-e332-45c0-afe0-3791b0c16fb2_1285ef3e-fe79-41ec-af90-61f06180146f.png' });

// 		const currentConfigText = {
// 			name: 'Current configuration',
// 			value: '',
// 		};

// 		currentConfigText.value += '- Join messages : ';
// 		if (guildSettings.joinChannelId && guildSettings.leaveChannelId) {
// 			currentConfigText.value += `Enabled with the message "${guildSettings.joinMessage}" on join and "${guildSettings.leaveMessage}" on leave`;
// 		}
// 		else {
// 			currentConfigText.value += 'Disabled';
// 		}
// 		currentConfigText.value += '\n- Leave messages : ';
// 		if (guildSettings.leaveChannelId) {
// 			currentConfigText.value += `Enabled with the message "${guildSettings.leaveMessage}"`;
// 		}
// 		else {
// 			currentConfigText.value += 'Disabled';
// 		}
// 		currentConfigText.value += '\n- Temporary voice calls : ';
// 		if (guildSettings.tempChannelId) {
// 			currentConfigText.value += `Enabled in ${await interaction.guild!.channels.fetch(guildSettings.tempChannelId)}`;
// 		}
// 		else {
// 			currentConfigText.value += 'Disabled';
// 		}
// 		currentConfigText.value += '\n- Maximum number of warnings : ';
// 		if (guildSettings.nbWarningsMax) {
// 			currentConfigText.value += guildSettings.nbWarningsMax;
// 		}
// 		else {
// 			currentConfigText.value += 'None';
// 		}
//         setupEmbed.addFields(currentConfigText);

// 		const setupSelect = new StringSelectMenuBuilder()
// 			.setCustomId('setup')
// 			.setPlaceholder('Choose an action')
// 			.setMinValues(0)
// 			.setMaxValues(1)
// 			.addOptions(
// 				new StringSelectMenuOptionBuilder()
// 					.setLabel('Join Message')
// 					.setDescription('Configure the custom messages sent by the bot when someone joins or leaves your server')
// 					.setValue('departure'),
// 				new StringSelectMenuOptionBuilder()
// 					.setLabel('Temporary Voice Channels')
// 					.setDescription('Configure the temporary voice channels')
// 					.setValue('temp_voice'),
// 				new StringSelectMenuOptionBuilder()
// 					.setLabel('Maximum Amount of Warnings')
// 					.setDescription('Configure the auto-banning feature after an user reaches a defined amount of warnings')
// 					.setValue('max_warnings'),
// 			);

// 		const setupRow = new ActionRowBuilder<StringSelectMenuBuilder>()
// 			.addComponents(setupSelect);

// 		return [setupEmbed, setupRow];
// 	}

//     private async attachSetupCollector(message: Message, commandCaller: GuildMember): Promise<void> {
// 		const setupCollector = message.createMessageComponentCollector({
// 			componentType: ComponentType.StringSelect,
// 			filter: i => i.user.id == commandCaller.id,
// 			time: 60000
// 		});

// 		setupCollector.on('end', async (collected, reason) => {
// 			if (reason == 'time') {
// 				await message.edit({ components: [] });
// 				await message.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
// 			}
// 		});

// 		setupCollector.on('ignore', async interaction => {
// 			await interaction.reply({ content: `${interaction.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
// 		});

// 		setupCollector.on('collect', async interaction => {
// 			setupCollector.stop('refresh');

// 			if (interaction.values.length > 0) {
// 				await interaction.deferReply();

// 				switch (interaction.values[0]) {
// 					case 'departure':
// 						await this.processDepartureSetup(interaction, commandCaller)
// 						break;
// 					case 'temp_voice':
// 						await this.processTempVoiceSetup(interaction, commandCaller)
// 						break;
// 					case 'max_warnings':
// 						await this.processMaxWarningsSetup(interaction, commandCaller)
// 						break;
// 				}
// 			}

// 			await this.refreshSetup();
// 		});
//     }

// 	private async processDepartureSetup(interaction: StringSelectMenuInteraction, commandCaller: GuildMember) {
// 		const joinButton = new ButtonBuilder()
// 			.setCustomId('join')
// 			.setEmoji('📥')
// 			.setStyle(ButtonStyle.Success);
// 		const leaveButton = new ButtonBuilder()
// 			.setCustomId('leave')
// 			.setEmoji('📤')
// 			.setStyle(ButtonStyle.Danger);
// 		const buttonRow = new ActionRowBuilder<ButtonBuilder>()
// 			.addComponents([joinButton, leaveButton]);
		
// 		const departureQuestion = await interaction.editReply({ content: 'Do you want to edit the join or the leave message ?', components: [buttonRow] });

// 		const ignoreHandler = MessageUtils.createIgnoreHandler(departureQuestion, commandCaller.id);

// 		const buttonPressed = await departureQuestion.awaitMessageComponent({
// 			componentType: ComponentType.Button,
// 			time: 60000,
// 			filter: i => i.user.id == commandCaller.id
// 		}).catch(() => null);

// 		ignoreHandler.stop();
// 		await departureQuestion.edit({ components: [] });
		
// 		if (!buttonPressed) {
// 			await departureQuestion.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
// 		}
// 		else {
// 			await buttonPressed.deferReply();

// 			// Channel selection here

// 			const departureMessage = await buttonPressed.editReply({ content: `Enter the new ${buttonPressed.customId} message you want to use. You can use the following syntax :\n- \${user} will be replaced with the name of the affected member\n- \${server} will be replaced with your server's name\n- \${memberCount} will be replaced with the new amount of member in your server` });

// 			const channel = interaction.channel;

// 			if (channel instanceof TextChannel) {
// 				const collectedMessages = await channel.awaitMessages({
// 					time: 60000,
// 					max: 1,
// 					filter: message => commandCaller.id == message.author.id,
// 				});

// 				if (collectedMessages.size == 0) {
// 					await departureMessage.reply('Since no answer has been given in the last 60 seconds, this interaction has been canceled.');
// 				}
// 				else {
// 					const answer = collectedMessages.first()!;
					
// 					if (buttonPressed.customId == 'join') {
// 						GuildSettingsService.updateGuildSettings({
// 							guildId: interaction.guildId!,
							
// 						})
// 					}
// 				}
// 			}
// 		}
// 	}

// 	private async processTempVoiceSetup(interaction: StringSelectMenuInteraction, commandCaller: GuildMember) {
// 		throw new Error('Not created yet');
// 	}

// 	private async processMaxWarningsSetup(interaction: StringSelectMenuInteraction, commandCaller: GuildMember) {
// 		throw new Error('Not created yet');
// 	}

// 	private async refreshSetup() {
// 		throw new Error('Not created yet');
// 	}
// }