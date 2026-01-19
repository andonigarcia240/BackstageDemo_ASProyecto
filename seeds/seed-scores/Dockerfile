FROM node
WORKDIR /home/app
COPY package*.json ./
RUN npm install --production
COPY . .
COPY data/scores.csv /home/app/data/scores.csv
CMD ["node","seeds/seed-scores/seed-scores.js"]
