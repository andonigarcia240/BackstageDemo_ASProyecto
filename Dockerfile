FROM node
WORKDIR /home/app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node","app.js"]