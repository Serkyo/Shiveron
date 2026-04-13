#!/bin/sh
echo "Waiting for LibreTranslate to be ready..."
until wget -qO- "${LIBRETRANSLATE_URL}/languages" 2>/dev/null | grep -q '"code"'; do
    echo "LibreTranslate not ready yet, retrying in 15s..."
    sleep 15
done
echo "LibreTranslate is ready. Starting bot..."
exec node dist/bot.js
