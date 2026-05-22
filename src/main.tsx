import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { ExercisesProvider } from './context/ExercisesContext';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ExercisesProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </ExercisesProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
