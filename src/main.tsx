import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { ExercisesProvider } from './context/ExercisesContext';
import { GymsProvider } from './context/GymsContext';
import { PeopleProvider } from './context/PeopleContext';
import { FeaturedProvider } from './context/FeaturedContext';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ExercisesProvider>
          <GymsProvider>
            <PeopleProvider>
              <FeaturedProvider>
                <SettingsProvider>
                  <App />
                </SettingsProvider>
              </FeaturedProvider>
            </PeopleProvider>
          </GymsProvider>
        </ExercisesProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
