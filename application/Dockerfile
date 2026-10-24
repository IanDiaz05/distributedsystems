FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js init-db.js data-config.js catalog-cache.js ./

USER node

EXPOSE 8080

CMD ["npm", "start"]
