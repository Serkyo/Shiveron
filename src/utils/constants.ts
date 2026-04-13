// Time unit conversions (milliseconds)
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const MS_PER_MONTH = 2_592_000_000;
export const MS_PER_YEAR = 31_104_000_000;

// Discord API limits
export const DISCORD_MAX_TIMEOUT_MS = 28 * MS_PER_DAY; // hard cap imposed by Discord
export const DISCORD_MAX_CHANNEL_NAME_LENGTH = 100;
export const DISCORD_SELECT_MENU_MAX_VALUES = 10;

// Interaction / collector timeouts
export const INTERACTION_TIMEOUT_MS = MS_PER_MINUTE;

// Application intervals
export const INFRACTION_EXPIRY_CHECK_INTERVAL_MS = 10 * MS_PER_MINUTE;

// Moderation defaults
export const DEFAULT_TIMEOUT_MS = MS_PER_HOUR;

// Translation (auto-detect)
export const TRANSLATION_MIN_CONFIDENCE = 70; // minimum confidence (0–100) to surface a translation
export const TRANSLATION_MIN_MESSAGE_LENGTH = 4; // messages shorter than this are not worth detecting