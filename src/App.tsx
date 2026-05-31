import { useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Workouts } from './pages/Workouts';
import { PersonalRecords } from './pages/PersonalRecords';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { Analytics } from './pages/Analytics';
import { MonthlyReports } from './pages/MonthlyReports';
import { Login } from './pages/Login';
import { useWorkouts } from './hooks/useWorkouts';
import { useAuth } from './context/AuthContext';
import { useExercises } from './context/ExercisesContext';
import { seedExercisesFromWorkouts } from './utils/exerciseSeed';
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
  const { user } = useAuth();
  const { workouts, loading } = useWorkouts();
  const { exercises, loading: exercisesLoading } = useExercises();
  const seedAttempted = useRef(false);

  // One-time migration: if the user has workout history but no exercise
  // library yet, seed the library from the exercise titles in their workouts.
  useEffect(() => {
    if (loading || exercisesLoading || seedAttempted.current) return;
    if (exercises.length > 0) { seedAttempted.current = true; return; }
    if (!user?.uid || workouts.length === 0) return;
    seedAttempted.current = true;
    seedExercisesFromWorkouts(user.uid, workouts).catch(err =>
      console.error('[DB] Exercise seeding failed:', err),
    );
  }, [loading, exercisesLoading, exercises.length, workouts, user]);

  if (loading || exercisesLoading) return <LoadingScreen label="Synching Backend..." />;

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard workouts={workouts} />} />
        <Route path="workouts" element={<Workouts workouts={workouts} />} />
        <Route path="records" element={<PersonalRecords workouts={workouts} />} />
        <Route path="exercises/:name" element={<ExerciseDetail workouts={workouts} />} />
        <Route path="analytics" element={<Analytics workouts={workouts} />} />
        <Route path="monthly" element={<MonthlyReports workouts={workouts} />} />
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
