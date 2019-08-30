FROM node:11.9.0
WORKDIR /usr/src/app

COPY package*.json ./
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh
RUN npm install
COPY . .
EXPOSE 3000
