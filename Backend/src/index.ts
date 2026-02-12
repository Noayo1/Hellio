import express from 'express';
import cors from 'cors';
import authRoutes from './auth.js';
import candidatesRoutes from './candidates.js';
import positionsRoutes from './positions.js';
import filesRoutes from './files.js';
import ingestionRoutes from './ingestion/routes.js';
import { chatRoutes } from './chat/index.js';
import { bootstrap } from './bootstrap.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/chat', chatRoutes);

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  bootstrap()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Bootstrap failed:', err);
      process.exit(1);
    });
}

export default app;
