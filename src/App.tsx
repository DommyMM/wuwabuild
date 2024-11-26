import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { EditPage } from './pages/EditPage';
import { OCRProvider } from './contexts/OCRContext';

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <EditPage />
    }
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_fetcherPersist: true,
      v7_skipActionErrorRevalidation: true
    }
  }
);

const App: React.FC = () => {
  return (
    <OCRProvider>
      <RouterProvider router={router} />
    </OCRProvider>
  );
};

export default App;