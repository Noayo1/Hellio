import express from 'express';
import cors from 'cors';
import authRoutes from './auth.js';
import candidatesRoutes from './candidates.js';
import positionsRoutes from './positions.js';
import filesRoutes from './files.js';
import ingestionRoutes from './ingestion/routes.js';

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

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
