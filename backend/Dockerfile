FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
ENV DATABASE_DIR=/app/database
VOLUME [ "/app/database" ]
CMD [ "npm", "start" ]
