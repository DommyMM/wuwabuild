import { createBrowserRouter, RouterProvider, Outlet, Link, useLocation } from 'react-router-dom';
import { EditPage } from './pages/EditPage';
import { HomePage } from './pages/HomePage';
import { BuildsPage } from './pages/BuildPage';
import { ImportPage } from './pages/ImportPage';
import './styles/App.css';

const Layout = () => {
  const location = useLocation();
  return (
    <>
      <nav className="nav-bar">
        <div className="nav-content">
          <Link to="/" className="nav-title">WuWaBuilds</Link>
          <div className="nav-links">
            <Link to="/edit" className={location.pathname === '/edit' ? 'active' : ''}>
              Create Build
            </Link>
            <Link to="/builds" className={location.pathname === '/builds' ? 'active' : ''}>
              Saved Builds
            </Link>
            <Link to="/import" className={location.pathname === '/import' ? 'active' : ''}>
              Import Build
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
      { path: "/", element: <HomePage /> },
      { path: "/edit", element: <EditPage /> },
      { path: "/builds", element: <BuildsPage /> },
      { path: "/import", element: <ImportPage /> }
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
  return <RouterProvider router={router} />;
};

export default App;