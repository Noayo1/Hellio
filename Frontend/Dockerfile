FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ ./src/
COPY index.html vite.config.ts tsconfig*.json ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
