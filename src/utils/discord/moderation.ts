import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';

export enum ModerationAction {
    BAN = 'ban',
    KICK = 'kick',
    TIMEOUT = 'timeout',
    WARN = 'warn',
}

export async function validateAuthor(interaction: ChatInputCommandInteraction, target: GuildMember | null, author: GuildMember, action: ModerationAction) : Promise<boolean> {
	if (!validateTarget(interaction, target)) {
		return false;
	}
	else if (target!.id == author.id) {
		await interaction.editReply({ content: `You cannot ${action} yourself.` });
		return false;
	}
	else if (target!.permissions.has(PermissionFlagsBits.Administrator)) {
		await interaction.editReply({ content: `I cannot ${action} this member.` });
		return false;
	}
	else if (author.roles.highest.comparePositionTo(target!.roles.highest)) {
		await interaction.editReply({ content: `You cannot ${action} this member, he has a higher role than you.` });
		return false;
	}
	return true;
}

export async function validateTarget(interaction: ChatInputCommandInteraction, target: GuildMember | null): Promise<boolean> {
	if (!target) {
		await interaction.editReply({ content: 'I cannot find the specified member.' });
		return false;
	}
	return true;
}
