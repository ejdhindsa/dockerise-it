FROM node:24
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
EXPOSE 8000
CMD ["node", "server.js"]
