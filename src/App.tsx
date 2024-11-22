import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EditPage } from './pages/EditPage';
import { ScanPage } from './pages/ScanPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/edit" replace />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/edit" element={<EditPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;