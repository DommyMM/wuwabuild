import { createBrowserRouter, RouterProvider, Outlet, Link, useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { useEffect } from 'react';
import { EditPage } from './pages/EditPage';
import { HomePage } from './pages/HomePage';
import { SavesPage } from './pages/SavePage';
import { ImportPage } from './pages/ImportPage';
import { BuildPage } from './pages/BuildsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { HelmetProvider } from 'react-helmet-async';
import './styles/App.css';

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ 
      hitType: "pageview", 
      page: location.pathname 
    });
  }, [location]);

  return (
    <>
      <nav className="nav-bar">
        <div className="nav-content">
          <Link to="/" className="nav-title">WuWaBuilds</Link>
          <div className="nav-links">
            <Link to="/import" className={location.pathname === '/import' ? 'active' : ''}>
              Import
            </Link>
            <Link to="/builds" className={location.pathname === '/builds' ? 'active' : ''}>
              Builds
            </Link>
            {/* <Link to="/leaderboards" className={location.pathname === '/leaderboards' ? 'active' : ''}>
              Leaderboards
            </Link> */}
            <Link to="/edit" className={location.pathname === '/edit' ? 'active' : ''}>
              Edit
            </Link>
            <Link to="/saves" className={location.pathname === '/saves' ? 'active' : ''}>
              Saves
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
      { path: "/saves", element: <SavesPage /> },
      { path: "/import", element: <ImportPage /> },
      { path: "/builds", element: <BuildPage /> },
      { path: "/leaderboards/*", element: <LeaderboardPage /> }
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
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  );
};

export default App;