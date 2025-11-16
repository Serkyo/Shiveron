import { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { BaseCommand } from './BaseCommand.js';
import { BaseEvent } from './BaseEvent.js';
import { Database } from './Database.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';
import { InfractionService } from '../services/InfractionService.js';

export class ShiveronClient extends Client {
	public commands: Collection<string, BaseCommand>;
	private db: Database;

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			],
		});

		this.commands = new Collection();
		this.db = Database.getInstance();
	}

	public async start(): Promise<void> {
		await this.db.connect();
		await this.loadCommands();
		await this.loadEvents();
		await this.registerSlashCommands();
		await this.login(process.env['DISCORD_TOKEN']);
		setInterval(async () => InfractionService.checkExpiredInfractions(this), 600000);
		this.user!.setPresence({
			activities: [{
				name: 'Deicide - Fractured Divinity',
				type: ActivityType.Playing
			}],
			status: 'dnd'
		});
	}

	private async loadCommands(): Promise<void> {
		const foldersPath = path.join(process.cwd(), 'dist/commands');
		if (!fs.existsSync(foldersPath)) {
			ShiveronLogger.warn(`Commands folder not found at ${foldersPath}`);
			return;
		}

		const commandFolder = fs.readdirSync(foldersPath);
		for (const folder of commandFolder) {
			const commandsPath = path.join(foldersPath, folder);
			const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

			for (const file of commandFiles) {
				try {
					const fullPath = path.join(commandsPath, file);
					const module = await import(pathToFileURL(fullPath).href);

					const CommandClass = module?.default;
					if (!CommandClass) {
						ShiveronLogger.warn(`Command file ${file} has no default export.`);
						continue;
					}

					const commandInstance: BaseCommand = new CommandClass();
					if (!commandInstance.data) {
						ShiveronLogger.warn(`Command ${file} has no data property. Skipping.`);
						continue;
					}

					this.registerCommand(commandInstance);
					ShiveronLogger.debug(`Loaded command: ${commandInstance.data.name}.`);
				}
				catch (error) {
					ShiveronLogger.error(`Failed to load command ${file} : ${error}`);
				}
			}
		}
		ShiveronLogger.info(`Loaded ${this.commands.size} command(s).`);
	}

	private async loadEvents(): Promise<void> {
		const eventsPath = path.join(process.cwd(), 'dist/events');
		if (!fs.existsSync(eventsPath)) {
			ShiveronLogger.warn(`Events folder not found at ${eventsPath}`);
			return;
		}

		const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
		let loadedCount = 0;

		for (const file of eventFiles) {
			try {
				const fullPath = path.join(eventsPath, file);
				const module = await import(pathToFileURL(fullPath).href);
				const EventClass = module?.default;

				if (!EventClass) {
					ShiveronLogger.warn(`Event file ${file} has no default export.`);
					continue;
				}

				const eventInstance: BaseEvent<any> = new EventClass();

				if (!('name' in eventInstance)) {
					ShiveronLogger.warn(`Event ${file} has no name property. Skipping.`);
					continue;
				}

				this.registerEvent(eventInstance);
				ShiveronLogger.debug(`Loaded event: ${eventInstance.name}.`);
				loadedCount++;

			}
			catch (error) {
				ShiveronLogger.error(`Failed to load event ${file} : ${error}`);
			}
		}

		ShiveronLogger.info(`Loaded ${loadedCount} event(s).`);
	}

	private async registerSlashCommands(): Promise<void> {
		const rest = new REST({ version: '10' }).setToken(process.env['DISCORD_TOKEN']!);
		const commandsArray = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());

		if (process.env['NODE_ENV'] === 'development') {
			if (!process.env['DISCORD_GUILD_ID']) {
				ShiveronLogger.warn('DISCORD_GUILD_ID is not set. Skipping guild command registration.');
				return;
			}
			await rest.put(
				Routes.applicationGuildCommands(process.env['DISCORD_CLIENT_ID']!, process.env['DISCORD_GUILD_ID']!),
				{ body: commandsArray },
			);
			ShiveronLogger.info(`Deployed ${commandsArray.length} commands to guild ${process.env['DISCORD_GUILD_ID']}.`);
		}
		else {
			await rest.put(Routes.applicationCommands(process.env['DISCORD_CLIENT_ID']!), { body: commandsArray });
			ShiveronLogger.info(`Deployed ${commandsArray.length} commands globally.`);
		}
	}

	public registerCommand(command: BaseCommand) {
		this.commands.set(command.data.name, command);
	}

	public registerEvent(event: BaseEvent<any>): void {
		if (event.once) {
			this.once(event.name, (...args) =>
				event.execute(this, ...args),
			);
		}
		else {
			this.on(event.name, (...args) =>
				event.execute(this, ...args),
			);
		}
	}
}