import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Workouts } from './pages/Workouts';
import { PersonalRecords } from './pages/PersonalRecords';
import { Analytics } from './pages/Analytics';
import { Login } from './pages/Login';
import { useWorkouts } from './hooks/useWorkouts';
import { useAuth } from './context/AuthContext';
import './App.css';

const LoadingScreen = ({ label }: { label: string }) => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
    <div style={{ fontFamily: 'Outfit', fontSize: '24px', letterSpacing: '2px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'pulse 1.5s infinite', opacity: 0.8 }}>
      WORKOUTS DATA
    </div>
    <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>{label}</p>
  </div>
);

function AuthedApp() {
  const { workouts, loading } = useWorkouts();

  if (loading) return <LoadingScreen label="Synching Backend..." />;

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard workouts={workouts} />} />
        <Route path="workouts" element={<Workouts workouts={workouts} />} />
        <Route path="records" element={<PersonalRecords workouts={workouts} />} />
        <Route path="analytics" element={<Analytics workouts={workouts} />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen label="Loading..." />;
  if (!user) return <Login />;

  return <AuthedApp />;
}

export default App;
