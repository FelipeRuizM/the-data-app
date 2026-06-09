import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { ExercisesProvider } from './context/ExercisesContext';
import { GymsProvider } from './context/GymsContext';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ExercisesProvider>
          <GymsProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </GymsProvider>
        </ExercisesProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
