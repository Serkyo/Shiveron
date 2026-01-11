import { Message, type MessageComponentType, MessageComponentInteraction, ComponentType, MessageFlags } from 'discord.js';

export async function awaitAuthorizedComponentInteraction(message: Message, ownerId: String, componentType: MessageComponentType): Promise<MessageComponentInteraction | null> {
	const ignoreHandler = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: i => i.user.id != ownerId,
	});

	ignoreHandler.on('collect', async (i) => {
		await i.reply({ content: `${i.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
	});

	const interaction = await message.awaitMessageComponent({
		componentType,
		time: 60000,
		filter: i => i.user.id == ownerId,
	}).catch(() => null);

	ignoreHandler.stop();
	await message.edit({ components: [] });

	return interaction;
}
