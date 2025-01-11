import { createBrowserRouter, RouterProvider, Outlet, Link, useLocation } from 'react-router-dom';
import { EditPage } from './pages/EditPage';
import { OCRProvider } from './contexts/OCRContext';
import { HomePage } from './pages/HomePage';
import { BuildsPage } from './pages/BuildPage';
import MobileNotice from './components/MobileNotice';
import './styles/App.css';

const Layout = () => {
  const location = useLocation();

  return (
    <>
      <nav className="nav-bar">
        <div className="nav-content">
          <Link to="/" className="nav-title">WuWa Builds</Link>
          <div className="nav-links">
            <Link 
              to="/edit" 
              className={location.pathname === '/edit' ? 'active' : ''}
            >
              Create Build
            </Link>
            <Link 
              to="/builds" 
              className={location.pathname === '/builds' ? 'active' : ''}
            >
              Saved Builds
            </Link>
          </div>
        </div>
      </nav>
      <Outlet />
    </>
  );
};

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <HomePage />
      },
      {
        path: "/edit",
        element: <EditPage />
      },
      {
        path: "/builds",
        element: <BuildsPage />
      }
    ]
  }
], {
  future: {
    v7_relativeSplatPath: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_fetcherPersist: true,
    v7_skipActionErrorRevalidation: true
  }
});

const App: React.FC = () => {
  return (
    <>
      <MobileNotice />
      <OCRProvider>
        <RouterProvider router={router} />
      </OCRProvider>
    </>
  );
};

export default App;