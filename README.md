<div align="center">
  <img src="./shiveron_icon.png" height="300" alt="Shiveron Icon">
  <h1>Shiveron</h1>
  <p>A multipurpose and modular Discord bot</p>
  <img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/Serkyo/Shiveron?style=flat">
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/Serkyo/Shiveron?style=flat&color=green">
  <img alt="GitHub forks" src="https://img.shields.io/github/forks/Serkyo/Shiveron?style=flat&color=aqua">
  <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Serkyo/Shiveron?style=flat&color=yellow">
  <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/Serkyo/Shiveron?style=flat&color=red">
  <img alt="GitHub License" src="https://img.shields.io/github/license/Serkyo/Shiveron?style=flat&color=silver">
  <br>
</div>

## Features
- Moderation commands (ban, kick, timeout, purge, etc.)
- Temporary voice channels
- Stores user infractions in a dedicated database
- Allows moderators to quickly view a user's infraction history
- And much more to come!

## Public hosted version
You can invite the public version of Shiveron by using [this link](https://discord.com/oauth2/authorize?client_id=1305623177753526282&permissions=8&integration_type=0&scope=applications.commands+bot).  
The bot is hosted by me, and I try my best to make sure it stays up 24/7.

## Requirements
- **Node.js** : Download it from the [official website](https://nodejs.org/en)
- **Discord bot token** : Available from the [Discord Developer Portal](https://discord.com/developers/applications), under the "Bot" tab
- **Discord client ID** : Found in the "General Information" tab of the [Discord Developer Portal](https://discord.com/developers/applications)

## Installation

### 1. Creating a Discord Bot Application
If you haven't already, create a Discord application at the [Discord Developer Portal](https://discord.com/developers/applications).  
Then, create a bot account within the application and reset its token to copy it.

To invite your bot to a server:
- Go to the **OAuth2** tab
- Under "OAuth2 URL Generator", check `application.commands` and `bot`
- In the permissions section, check `Administrator`
- Copy the generated link and open it in your browser to invite the bot to your server

### 2. Installing and Running Shiveron

If your bot is ready, follow these steps:

- Clone the repository :
```
git clone https://github.com/Serkyo/Shiveron.git
```
- Rename the file `example_config.json` to `config.json` and fill in the required fields
- Install the dependencies :
```
npm install
```
- Start the bot :
```
node .
```
## Contributing
Feel free to [Fork](https://github.com/Serkyo/Shiveron/fork) this repository, create a feature branch or submit a pull request. 
If you encounter any issue, please report them [here](https://github.com/Serkyo/Shiveron/issues).
If you like this project, you can support me on [Ko-Fi](https://ko-fi.com/serkyo) !
