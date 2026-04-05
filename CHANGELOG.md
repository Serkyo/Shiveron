# Changelog

All notable changes to Shiveron are documented here.

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
