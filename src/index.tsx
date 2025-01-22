import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { wakeupServer } from './components/Edit/Scan';
import { OCRProvider } from './contexts/OCRContext';
import { ToastContainer } from 'react-toastify';
import { useCharacters } from './hooks/useCharacters';
import { useWeapons } from './hooks/useWeapons';
import { useEchoes } from './hooks/useEchoes';
import { WeaponType } from './types/weapon';
import { useMigrate } from './hooks/useMigrate';

const DataWrapper = ({ children }: { children: React.ReactNode }) => {
  useMigrate();
  wakeupServer();
  const { loading: charLoading } = useCharacters();
  const { loading: echoLoading } = useEchoes();
  const { loading: weaponLoading } = useWeapons({ weaponType: WeaponType.Sword });
  const isLoading = charLoading || echoLoading || weaponLoading;

  if (isLoading) {
    return <div className="loading">Loading game data...</div>;
  }
  return <>{children}</>;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <DataWrapper>
      <OCRProvider>
        <App />
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover draggable theme="dark" toastStyle={{ fontFamily: 'Gowun' }} />
        <Analytics />
        <SpeedInsights />
      </OCRProvider>
    </DataWrapper>
  </React.StrictMode>
);