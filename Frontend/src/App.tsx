import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CandidatesPage from './pages/CandidatesPage';
import PositionsPage from './pages/PositionsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/candidates" replace />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="positions" element={<PositionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
