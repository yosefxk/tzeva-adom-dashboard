FROM node:22-alpine
RUN apk add --no-cache tzdata
ENV TZ=Asia/Jerusalem
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
ENV DATABASE_DIR=/app/database
VOLUME [ "/app/database" ]
CMD [ "npm", "start" ]
