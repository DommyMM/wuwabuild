import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EditPage } from './pages/EditPage';
import { OCRProvider } from './contexts/OCRContext';

const App: React.FC = () => {
  return (
    <OCRProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EditPage />} />
        </Routes>
      </BrowserRouter>
    </OCRProvider>
  );
};

export default App;