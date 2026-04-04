import { Message, type MessageComponentType, MessageComponentInteraction, ComponentType, MessageFlags } from 'discord.js';

/**
 * Waits for a single component interaction on a message from a specific user, while replying
 * with an error to anyone else who tries to interact.
 * Removes all components from the message after the interaction is resolved or times out.
 * @param message - The message containing the components to listen on.
 * @param ownerId - The Discord user ID of the only person allowed to interact.
 * @param componentType - The type of component to await (e.g., `ComponentType.Button`).
 * @returns The resolved interaction, or `null` if the 60-second timeout expires without interaction.
 */
export async function awaitAuthorizedComponentInteraction(message: Message, ownerId: String, componentType: MessageComponentType): Promise<MessageComponentInteraction | null> {
	const ignoreHandler = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: i => i.user.id != ownerId,
	});

	ignoreHandler.on('collect', async (i) => {
		i.reply({ content: `${i.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
	});

	const interaction = await message.awaitMessageComponent({
		componentType,
		time: 60000,
		filter: i => i.user.id == ownerId,
	}).catch(() => null);

	ignoreHandler.stop();
	message.edit({ components: [] });

	return interaction;
}
