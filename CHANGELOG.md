# Changelog

All notable changes to Shiveron are documented here.

## [v1.2.0] — Message Translation

### Added
- Auto-translation: messages are automatically translated to the guild's configured language when a different language is detected and this feature is enabled via the setup panel
- Flag emoji reaction translation: reacting to a message with a flag emoji triggers a translation into that language
- `/translate` command to manually translate a given text into a chosen language
- Channel blacklist for auto-translation: specific channels can be excluded from the feature via the setup panel
- Autocompletion support in commands
- LibreTranslate added to the Docker stack as the self-hosted translation backend

### Fixed
- German translation unavailable in the setup panel
- Language names not being I18N compatible in the setup panel
- Docker Compose stack not starting correctly in some cases

## [v1.1.2] — German translation

Added german support to the i18n

## [v1.1.1] — Bug fixes

Fixed several issues linked to voice channels :
- Channel controls not refreshing in some cases
- Blacklisted people not being removed from the blacklist if they are already present and selected
- Unarchived project, development has resumed following the platform's revision of its privacy policy


## [v1.1.0] — Internationalization (i18n)

- Added an internationalization setting, allowing guilds to select their language. Currently support English and French
- Removed deprecated packages
- Refactored some parts of the code to be more performant

## [v1.0.0] — Initial release

- Moderation commands : ban, kick, timeout, warn, purge, and infraction history
- Temporary voice channels with a contextual menu for users to manage their own channel (name, privacy, whitelist/blacklist, ownership transfer)
- Channel inheritance when the owner leaves
- Auto-deletion of idle temporary channels
- Guild settings setup command
- Infraction storage and auto-expiry check every 10 minutes
- Join and leave messages for voice channels
- Log files saved to disk
- Docker-based deployment with PostgreSQL
- Linux setup script for easy installation
