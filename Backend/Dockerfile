FROM node:20-alpine

WORKDIR /app

COPY Backend/package*.json ./

RUN npm ci

COPY Backend/src/ ./src/
COPY Backend/tests/ ./tests/
COPY Backend/vitest.config.ts ./
COPY Backend/tsconfig.json ./

# Copy seed data files
COPY Frontend/src/data/ ./seed-data/
COPY CVsJobs/cvs/ ./seed-data/cvs/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "dev"]
