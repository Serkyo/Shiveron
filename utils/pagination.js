const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

async function pagination(interaction, pages, time = 60000) {
	await interaction.deferReply();

	if (pages.length == 1) {
		return interaction.editReply({ embeds: pages });
	}

	let index = 0;

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
		.setLabel(`${index + 1}/${pages.length}`)
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

	const buttons = new ActionRowBuilder()
		.addComponents([pageFirst, pagePrev, pageCount, pageNext, pageLast]);

	const msg = await interaction.editReply({ embeds: [pages[index]], components: [buttons], fetchReply: true });

	const collector = await msg.createMessageComponentCollector({
		componentType : ComponentType.Button,
		time,
	});

	collector.on('collect', async i => {
		if (i.user.id != interaction.user.id) {
			return i.reply({ content: 'You are not allowed to use these buttons', flags: MessageFlags.Ephemeral });
		}
		await i.deferUpdate();

		switch (i.customId) {
		case 'pagefirst':
			index = 0;
			break;
		case 'pageprev':
			index--;
			break;
		case 'pagenext':
			index++;
			break;
		case 'pagelast':
			index = pages.length - 1;
			break;
		}

		pageFirst.setDisabled(index == 0);
		pagePrev.setDisabled(index == 0);
		pageNext.setDisabled(index == pages.length - 1);
		pageLast.setDisabled(index == pages.length - 1);
		pageCount.setLabel(`${index + 1}/${pages.length}`);

		await msg.edit({ embeds: [pages[index]], components: [buttons] });
		collector.resetTimer();
	});

	collector.on('end', async () => {
		await msg.edit({ embeds: [pages[index]], components: [] });
	});
}

module.exports = pagination;