import { useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { useWorkouts } from './hooks/useWorkouts';

// Route components are lazy-loaded so the initial bundle is just the app shell.
// Named exports need to be mapped onto `default` for React.lazy.
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Workouts = lazy(() => import('./pages/Workouts').then(m => ({ default: m.Workouts })));
const AddWorkout = lazy(() => import('./pages/AddWorkout').then(m => ({ default: m.AddWorkout })));
const AddRun = lazy(() => import('./pages/AddRun').then(m => ({ default: m.AddRun })));
const PersonalRecords = lazy(() => import('./pages/PersonalRecords').then(m => ({ default: m.PersonalRecords })));
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail').then(m => ({ default: m.ExerciseDetail })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const MonthlyReports = lazy(() => import('./pages/MonthlyReports').then(m => ({ default: m.MonthlyReports })));
const Running = lazy(() => import('./pages/Running').then(m => ({ default: m.Running })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
import { useAuth } from './context/AuthContext';
import { useExercises } from './context/ExercisesContext';
import { seedExercisesFromWorkouts } from './utils/exerciseSeed';
import './App.css';

const LoadingScreen = ({ label }: { label: string }) => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
    <div style={{ fontFamily: 'Outfit', fontSize: '24px', letterSpacing: '2px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'pulse 1.5s infinite', opacity: 0.8 }}>
      THE DATA APP
    </div>
    <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>{label}</p>
    <span style={{ marginTop: '8px', fontFamily: 'Inter', fontSize: '12px', color: 'var(--text-muted)', opacity: 0.7 }}>
      v{__APP_VERSION__}
    </span>
  </div>
);

function AuthedApp() {
  const { user, canWrite } = useAuth();
  const { workouts, loading } = useWorkouts();
  const { exercises, loading: exercisesLoading } = useExercises();
  const seedAttempted = useRef(false);

  // One-time migration: if the user has workout history but no exercise
  // library yet, seed the library from the exercise titles in their workouts.
  useEffect(() => {
    if (loading || exercisesLoading || seedAttempted.current) return;
    if (!canWrite) return; // guests never write
    if (exercises.length > 0) { seedAttempted.current = true; return; }
    if (!user?.uid || workouts.length === 0) return;
    seedAttempted.current = true;
    seedExercisesFromWorkouts(user.uid, workouts).catch(err =>
      console.error('[DB] Exercise seeding failed:', err),
    );
  }, [loading, exercisesLoading, exercises.length, workouts, user, canWrite]);

  if (loading || exercisesLoading) return <LoadingScreen label="Synching Backend..." />;

  return (
    <Suspense fallback={<LoadingScreen label="Loading..." />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard workouts={workouts} />} />
          <Route path="workouts" element={<Workouts workouts={workouts} />} />
          <Route path="add/workout" element={<AddWorkout workouts={workouts} />} />
          <Route path="add/run" element={<AddRun />} />
          <Route path="records" element={<PersonalRecords workouts={workouts} />} />
          <Route path="exercises/:name" element={<ExerciseDetail workouts={workouts} />} />
          <Route path="analytics" element={<Analytics workouts={workouts} />} />
          <Route path="monthly" element={<MonthlyReports workouts={workouts} />} />
          <Route path="running" element={<Running />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  const { user, loading, isGuest } = useAuth();

  if (loading) return <LoadingScreen label="Loading..." />;
  if (!user && !isGuest) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading..." />}>
        <Login />
      </Suspense>
    );
  }

  return <AuthedApp />;
}

export default App;
