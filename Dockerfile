FROM node:latest
WORKDIR /usr/local/app
COPY package.json .
RUN npm install
COPY . .
ENV REDIS_HOST=redis
CMD ["node", "app.js"]