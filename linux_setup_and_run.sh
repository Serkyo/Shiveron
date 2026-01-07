#!/bin/bash
set -e

CYAN="\e[36m"
RESET="\e[0m"

ENV_CREATED=false

if [ -f .env.example ]; then
    cp .env.example .env
    ENV_CREATED=true

    prompt_replace() {
        local key="$1"
        local prompt_text="$2"
        read -p "$(echo -e "${CYAN}$prompt_text:${RESET} ")" value
        sed -i "s|^$key=.*|$key=$value|" .env
    }

    echo -e "${CYAN}Please enter the following values:${RESET}"
    prompt_replace "DISCORD_TOKEN" "Discord Bot Token"
    prompt_replace "DISCORD_CLIENT_ID" "Discord Client ID"
    prompt_replace "DISCORD_GUILD_ID" "Discord Guild ID (leave empty if you do not plan on adding features)"
    prompt_replace "DB_NAME" "Database Name"
    prompt_replace "DB_USER" "Database User"
    prompt_replace "DB_PASS" "Database Password"

    while true; do
        read -p "$(echo -e "${CYAN}Is this bot running in production mode? (Y/n):${RESET} ")" yn
        yn=${yn:-y}
        case $yn in
            [Yy]* ) sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" .env; break;;
            [Nn]* ) sed -i "s|^NODE_ENV=.*|NODE_ENV=development|" .env; break;;
            * ) echo -e "${CYAN}Please answer y or n.${RESET}";;
        esac
    done
else
    echo -e "${CYAN}.env.example not found, assuming .env was already configured.${RESET}"
fi

if [ "$(docker ps -q -f name=shiveron-db)" == "" ]; then
    echo -e "${CYAN}Starting database container...${RESET}"
    docker compose up -d db
fi

echo -e "${CYAN}Rebuilding and starting bot container...${RESET}"
docker compose build bot
docker compose up -d bot

if [ "$ENV_CREATED" = true ]; then
    rm .env.example
fi

echo -e "${CYAN}Bot is running in detached mode.${RESET}"
echo -e "${CYAN}Use 'docker compose logs -f bot' to view logs and 'docker compose stop' to stop both the bot and database.${RESET}"
echo -e "${CYAN}If you want to stop only one, use either 'docker compose stop bot' or docker compose stop db'.${RESET}"
echo -e "${CYAN}To change the environment values, edit the '.env' file directly as this script will now start the bot directly instead${RESET}"
