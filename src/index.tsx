import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import ReactGA from 'react-ga4';
import { wakeupServer } from './components/Edit/Scan';
import { OCRProvider } from './contexts/OCRContext';
import { ToastContainer } from 'react-toastify';
import { useCharacters } from './hooks/useCharacters';
import { useWeapons } from './hooks/useWeapons';
import { useEchoes } from './hooks/useEchoes';
import { WeaponType } from './types/weapon';
import { useMain } from './hooks/useMain';
import { useSubstats } from './hooks/useSub';
import { useMigrate } from './hooks/useMigrate';

ReactGA.initialize('G-SP375JKDPX');

const DataWrapper = ({ children }: { children: React.ReactNode }) => {
  useMigrate();
  wakeupServer();
  
  const { loading: charLoading } = useCharacters();
  const { loading: echoLoading } = useEchoes();
  const { loading: weaponLoading } = useWeapons({ weaponType: WeaponType.Sword });
  const { loading: mainStatLoading } = useMain();
  const { loading: subStatLoading } = useSubstats();
  
  const isLoading = charLoading || 
    echoLoading || 
    weaponLoading || 
    mainStatLoading || 
    subStatLoading;

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
      </OCRProvider>
    </DataWrapper>
  </React.StrictMode>
);