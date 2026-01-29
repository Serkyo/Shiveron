import { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { BaseCommand } from './BaseCommand.js';
import { BaseEvent } from './BaseEvent.js';
import { Database } from './Database.js';
import { ShiveronLogger } from './ShiveronLogger.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { VoiceService } from '../services/VoiceService.js';
import { InfractionService } from '../services/InfractionService.js';
import { getConfig } from '../utils/config.js';
import { VoiceCollectorManager } from '../utils/discord/VoiceCollectorManager.js';
// import { I18N } from './I18N.js';

export class ShiveronClient extends Client {
	public commands: Collection<string, BaseCommand>;
	public logger: ShiveronLogger;
	private db: Database;
	public voiceCollectorManager: VoiceCollectorManager;
	public guildSettingsService: GuildSettingsService;
	public infractionService: InfractionService;
	public voiceService: VoiceService;
	// public i18n: I18N;

	public constructor() {
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
		this.logger = new ShiveronLogger();
		this.db = new Database(this.logger);
		this.voiceCollectorManager = new VoiceCollectorManager();
		this.guildSettingsService = new GuildSettingsService(this.logger);
		this.infractionService = new InfractionService(this.logger);
		this.voiceService = new VoiceService(this.logger);
		// this.i18n = new I18N();
	}

	public async start(): Promise<void> {
		await this.db.connect();
		await this.loadCommands();
		await this.loadEvents();
		await this.registerSlashCommands();
		await this.login(getConfig('DISCORD_TOKEN'));
		setInterval(async () => this.infractionService.checkExpiredInfractions(this), 600000);
		this.user!.setPresence({
			activities: [{
				name: 'Deicide - Fractured Divinity',
				type: ActivityType.Playing,
			}],
			status: 'dnd',
		});
	}

	private async loadCommands(): Promise<void> {
		const foldersPath = path.join(process.cwd(), 'dist/commands');
		if (!fs.existsSync(foldersPath)) {
			this.logger.warn(`Commands folder not found at ${foldersPath}`);
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
						this.logger.warn(`Command file ${file} has no default export.`);
						continue;
					}

					const commandInstance: BaseCommand = new CommandClass();
					if (!commandInstance.data) {
						this.logger.warn(`Command ${file} has no data property. Skipping.`);
						continue;
					}

					this.registerCommand(commandInstance);
					this.logger.debug(`Loaded command: ${commandInstance.data.name}.`);
				}
				catch (error) {
					this.logger.error(`Failed to load command ${file} : ${error}`);
				}
			}
		}
		this.logger.info(`Loaded ${this.commands.size} command(s).`);
	}

	private async loadEvents(): Promise<void> {
		const eventsPath = path.join(process.cwd(), 'dist/events');
		if (!fs.existsSync(eventsPath)) {
			this.logger.warn(`Events folder not found at ${eventsPath}`);
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
					this.logger.warn(`Event file ${file} has no default export.`);
					continue;
				}

				const eventInstance: BaseEvent<any> = new EventClass();

				if (!('name' in eventInstance)) {
					this.logger.warn(`Event ${file} has no name property. Skipping.`);
					continue;
				}

				this.registerEvent(eventInstance);
				this.logger.debug(`Loaded event: ${eventInstance.name}.`);
				loadedCount++;

			}
			catch (error) {
				this.logger.error(`Failed to load event ${file} : ${error}`);
			}
		}

		this.logger.info(`Loaded ${loadedCount} event(s).`);
	}

	private async registerSlashCommands(): Promise<void> {
		const rest = new REST({ version: '10' }).setToken(getConfig('DISCORD_TOKEN')!);
		const commandsArray = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());

		if (getConfig('NODE_ENV') === 'development') {
			if (!getConfig('DISCORD_GUILD_ID')) {
				this.logger.warn('DISCORD_GUILD_ID is not set. Skipping guild command registration.');
				return;
			}
			await rest.put(
				Routes.applicationGuildCommands(getConfig('DISCORD_CLIENT_ID')!, getConfig('DISCORD_GUILD_ID')!),
				{ body: commandsArray },
			);
			this.logger.info(`Deployed ${commandsArray.length} commands to guild ${getConfig('DISCORD_GUILD_ID')}.`);
		}
		else {
			await rest.put(Routes.applicationCommands(getConfig('DISCORD_CLIENT_ID')!), { body: commandsArray });
			this.logger.info(`Deployed ${commandsArray.length} commands globally.`);
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