import { EmbedBuilder, type Message } from "discord.js";
import { BaseEvent } from "../core/BaseEvent.js";
import type { ShiveronClient } from "../core/ShiveronClient.js";
import type { HelldiverStratagem } from "../utils/HelldiverStratagem.js";

export default class MessageCreateEvent extends BaseEvent<'messageCreate'> {
	public readonly name = 'messageCreate';
	public once = false;

	public async execute(client: ShiveronClient, message: Message): Promise<void> {
		try {
            if (!message.author.bot && message.guildId) {
                const [stratagem, highlightedMessage] = this.searchForStratagems(client, message);

                if (stratagem) {
                    const [currentGuild] = await client.guildSettingsService.createOrGetGuildSettings(message.guildId);
                    const stratagemEmbed = this.createStratagemMessage(client, currentGuild.lang, message, stratagem, highlightedMessage);
                    message.reply({ embeds: [stratagemEmbed] });
                }
            }
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}

    private searchForStratagems(client: ShiveronClient, message: Message): [HelldiverStratagem | null, string] {
        const content = message.content.toLowerCase();

        for (const stratagem of client.helldiverStratagems) {
            const inputVariations = [
                stratagem.getArrowsInputs(),
                stratagem.getWasdInputs(),
                stratagem.getEmojiInputs(),
                stratagem.getTextInputs()
            ];

            for (const sequence of inputVariations) {
                const highlightedMessage = this.getHighlightedMessage(content, sequence);
                if (highlightedMessage) {
                    return [stratagem, highlightedMessage];
                }
            }
        }
        return [null, ""];
    }

    private getHighlightedMessage(text: string, sequence: string[]): string | null {
        if (sequence.length === 0) return null;

        let sequenceIndex = 0;
        let highlightedText = "";
        
        for (let i = 0; i < text.length; i++) {
            const currentTarget = sequence[sequenceIndex]?.toLowerCase();
            
            if (currentTarget && text.substring(i).toLowerCase().startsWith(currentTarget)) {
                const originalPart = text.substring(i, i + currentTarget.length);
                highlightedText += originalPart.toUpperCase();
                
                sequenceIndex++;
                i += currentTarget.length - 1;
            } else {
                highlightedText += text[i];
            }

            if (sequenceIndex === sequence.length) {
                highlightedText += text.substring(i + 1);
                return highlightedText;
            }
        }

        return null;
    }

    private createStratagemMessage(client: ShiveronClient, lang: string, message: Message, stratagem: HelldiverStratagem, highlightedMessage: string): EmbedBuilder {
        const stratagemEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: client.i18n.translate(lang, 'helldivers.embed.author'), 
                iconURL: 'https://helldivers.wiki.gg/images/Locations_Icon.svg?7f3375'
             })
            .setTitle(client.i18n.translate(lang, `helldivers.stratagem.${stratagem.getIdentifier()}.name`))
            .setURL(stratagem.getWikiURL())
            .setThumbnail(stratagem.getIconURL())
            .setDescription(client.i18n.translate(lang, `helldivers.stratagem.${stratagem.getIdentifier()}.description`,))
            .addFields(
                {
                    name: client.i18n.translate(lang, 'helldivers.embed.fields.sequence'),
                    value: stratagem.getEmojiInputs().join(''),
                },
                {
                    name: client.i18n.translate(lang, 'helldivers.embed.fields.highlighted'),
                    value: highlightedMessage
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: message.author.displayName, 
                iconURL: message.author.displayAvatarURL()});
        
        return stratagemEmbed;
    }
}
