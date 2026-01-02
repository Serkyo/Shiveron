import { EmbedBuilder, Message, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageComponentInteraction, MessageFlags, InteractionCollector, ButtonInteraction } from 'discord.js';
import { ShiveronLogger } from './ShiveronLogger.js';

export class MessageUtils {
	public static async paginateFromInteraction(interaction: ChatInputCommandInteraction, pages: EmbedBuilder[], timeout: number): Promise<void> {
		const buttons = this.createButtonsPagination(pages.length);
		const message = await interaction.editReply({
			embeds: [pages[0]!],
			components: [buttons],
		}) as Message;

		this.setupPaginationCollector(message, interaction.user.id, pages, timeout, buttons);
	}

	public static createIgnoreHandler(message: Message, ownerId: String): InteractionCollector<ButtonInteraction> {
		const ignoreHandler = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 60000,
			filter: i => i.user.id != ownerId,
		});

		ignoreHandler.on('collect', async (i) => {
			await i.reply({ content: `${i.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
		});

		return ignoreHandler
	}

	private static createButtonsPagination(pagesAmount: number): ActionRowBuilder<ButtonBuilder> {
		const pageFirst = new ButtonBuilder()
			.setCustomId('pagefirst')
			.setEmoji('⏮')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true);

		const pagePrev = new ButtonBuilder()
			.setCustomId('pageprev')
			.setEmoji('◀️')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true);

		const pageCount = new ButtonBuilder()
			.setCustomId('pagecount')
			.setLabel('1/1')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		const pageNext = new ButtonBuilder()
			.setCustomId('pagenext')
			.setEmoji('▶️')
			.setStyle(ButtonStyle.Primary);

		const pageLast = new ButtonBuilder()
			.setCustomId('pagelast')
			.setEmoji('⏭')
			.setStyle(ButtonStyle.Primary);

		if (pagesAmount == 1) {
			pageNext.setDisabled(true);
			pageLast.setDisabled(true);
		}

		return new ActionRowBuilder<ButtonBuilder>()
			.addComponents([pageFirst, pagePrev, pageCount, pageNext, pageLast]);
	}

	private static updateButtonsPagination(buttons: ActionRowBuilder<ButtonBuilder>, currentPage: number, totalPages: number): void {
		const [pageFirst, pagePrev, pageCount, pageNext, pageLast] = buttons.components;

        pageFirst!.setDisabled(currentPage === 0);
        pagePrev!.setDisabled(currentPage === 0);
        pageNext!.setDisabled(currentPage === totalPages - 1);
        pageLast!.setDisabled(currentPage === totalPages - 1);
        pageCount!.setLabel(`${currentPage + 1}/${totalPages}`);
	}

	private static disableButtonsPagination(buttons: ActionRowBuilder<ButtonBuilder>): void {
		buttons.components.forEach(button => {
			if (button.data.style !== ButtonStyle.Secondary) {
				button.setDisabled(true);
			}
		});
	}

	private static setupPaginationCollector(message: Message, ownerId: string, pages: EmbedBuilder[], timeout: number, buttons: ActionRowBuilder<ButtonBuilder>,
	): void {
		let currentPage = 0;

		if (pages.length == 1) {
			return;
		}

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: timeout,
		});

		collector.on('end', async () => {
			try {
				this.disableButtonsPagination(buttons);

				await message.edit({
					content: 'The buttons have been disabled because more than 60 seconds have passed since the last interaction',
					embeds: [pages[currentPage]!.data],
					components: [buttons],
				});
			}
			catch (error) {
				ShiveronLogger.error(`Failed to cleanup pagination : ${error}`);
			}
		});

		collector.on('collect', async (interaction: MessageComponentInteraction) => {
			try {
				if (interaction.user.id !== ownerId) {
					await interaction.reply({
						content: 'You are not allowed to use these buttons',
						ephemeral: true,
					});
					return;
				}

				await interaction.deferUpdate();

				switch (interaction.customId) {
				case 'pagefirst':
					currentPage = 0;
					break;
				case 'pageprev':
					currentPage = Math.max(0, currentPage - 1);
					break;
				case 'pagenext':
					currentPage = Math.min(pages.length - 1, currentPage + 1);
					break;
				case 'pagelast':
					currentPage = pages.length - 1;
					break;
				}

				this.updateButtonsPagination(buttons, currentPage, pages.length);

				await interaction.editReply({
					embeds: [pages[currentPage]!],
					components: [buttons],
				});

				collector.resetTimer();
			}
			catch (error) {
				ShiveronLogger.error(`Failed to handle pagination interaction : ${error}`);
			}
		});
	}
}