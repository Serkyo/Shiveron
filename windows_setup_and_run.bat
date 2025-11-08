@echo off
setlocal enabledelayedexpansion

set "ENV_CREATED=false"

if exist .env.example (
    copy .env.example .env >nul
    set "ENV_CREATED=true"
    
    echo Please enter the following values:
    echo.
    
    set /p "DISCORD_TOKEN=Discord Bot Token: "
    call :replace_in_env "DISCORD_TOKEN" "!DISCORD_TOKEN!"
    
    set /p "DISCORD_CLIENT_ID=Discord Client ID: "
    call :replace_in_env "DISCORD_CLIENT_ID" "!DISCORD_CLIENT_ID!"
    
    set /p "DISCORD_GUILD_ID=Discord Guild ID (leave empty if you do not plan on adding features): "
    call :replace_in_env "DISCORD_GUILD_ID" "!DISCORD_GUILD_ID!"
    
    set /p "DB_NAME=Database Name: "
    call :replace_in_env "DB_NAME" "!DB_NAME!"
    
    set /p "DB_USER=Database User: "
    call :replace_in_env "DB_USER" "!DB_USER!"
    
    set /p "DB_PASS=Database Password: "
    call :replace_in_env "DB_PASS" "!DB_PASS!"
    
    :ask_mode
    set /p "yn=Is this bot running in deployment mode? (Y/n): "
    if "!yn!"=="" set "yn=y"
    if /i "!yn!"=="y" (
        call :replace_in_env "NODE_ENV" "deployment"
    ) else if /i "!yn!"=="n" (
        call :replace_in_env "NODE_ENV" "development"
    ) else (
        echo Please answer y or n.
        goto ask_mode
    )
) else (
    echo .env.example not found, assuming .env was already configured.
)

for /f "tokens=*" %%i in ('docker ps -q -f name^=shiveron-db 2^>nul') do set "db_container=%%i"
if "!db_container!"=="" (
    echo Starting database container...
    docker compose up -d db
)

echo Rebuilding and starting bot container...
docker compose build bot
docker compose up -d bot

if "!ENV_CREATED!"=="true" (
    del .env.example
)

echo Bot is running in detached mode.
echo Use 'docker compose logs -f bot' to view logs and 'docker compose stop' to stop both the bot and database.
echo If you want to stop only one, use either 'docker compose stop bot' or docker compose stop db'.
echo To change the environment values, edit the '.env' file directly as this script will now start the bot directly instead

goto :eof

:replace_in_env
set "key=%~1"
set "value=%~2"
powershell -Command "(Get-Content .env) -replace '^%key%=.*', '%key%=%value%' | Set-Content .env"
goto :eof