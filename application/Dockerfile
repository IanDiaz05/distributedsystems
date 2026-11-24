FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY index.js init-db.js data-config.js catalog-cache.js ./

USER node

EXPOSE 8080

CMD ["npm", "start"]
