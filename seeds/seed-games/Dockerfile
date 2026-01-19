FROM node
WORKDIR /home/app
COPY package*.json ./
RUN npm install --production
COPY . .
COPY data/vgsales.csv /home/app/data/vgsales.csv
CMD ["node","seeds/seed-games/seed-games.js"]