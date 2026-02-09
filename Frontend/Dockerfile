FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src/ ./src/
COPY index.html vite.config.ts tsconfig*.json ./

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173 || exit 1

CMD ["npm", "run", "dev", "--", "--host"]
