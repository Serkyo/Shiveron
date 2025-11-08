FROM node:22-alpine as development

WORKDIR /usr/src/app

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build && rm -rf src

CMD ["node", "dist/bot.js"]