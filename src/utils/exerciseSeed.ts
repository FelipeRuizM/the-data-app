import { ref, get, set, push } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// ─── Legacy Muscle Group Mapping ─────────────────────────────────────────────
// This partial, case-insensitive map is NO LONGER a runtime source of truth —
// exercises and their muscle groups now live in the database. It is kept only
// to make a one-time best guess when migrating a user's existing workout
// history into the exercises collection (see seedExercisesFromWorkouts).
// Order matters: more specific entries must come before general ones.

const LEGACY_MUSCLE_MAP: Record<string, string> = {
  // Chest
  'Incline Bench Press': 'Chest',
  'Decline Bench Press': 'Chest',
  'Bench Press': 'Chest',
  'Incline Press': 'Chest',
  'Decline Press': 'Chest',
  'Chest Fly': 'Chest',
  'Cable Fly': 'Chest',
  'Pec Deck': 'Chest',
  'Chest Press': 'Chest',
  'Push Up': 'Chest',
  'Dip': 'Chest',

  // Back
  'Romanian Deadlift': 'Legs', // More legs than back, override before generic Deadlift
  'Deadlift': 'Back',
  'Pulldown': 'Back',
  'Lat Pull': 'Back',
  'Pull Up': 'Back',
  'Chin Up': 'Back',
  'Seated Row': 'Back',
  'Cable Row': 'Back',
  'Bent Over Row': 'Back',
  'Row': 'Back',
  'Back Extension': 'Back',
  'Pull Over': 'Back',
  'Shrug': 'Back',
  'Rack Pull': 'Back',
  'Muscle Up': 'Back',

  // Legs
  'Hack Squat': 'Legs',
  'Front Squat': 'Legs',
  'Split Squat': 'Legs',
  'Bulgarian Split Squat': 'Legs',
  'Squat': 'Legs',
  'Leg Press': 'Legs',
  'Leg Extension': 'Legs',
  'Leg Curl': 'Legs',
  'Lying Leg Curl': 'Legs',
  'Seated Leg Curl': 'Legs',
  'Hip Thrust': 'Legs',
  'Glute Bridge': 'Legs',
  'Hip Abduction': 'Legs',
  'Hip Adduction': 'Legs',
  'Adduction': 'Legs',
  'Abduction': 'Legs',
  'Calf Raise': 'Legs',
  'Calf': 'Legs',
  'Nordic': 'Legs',
  'Lunge': 'Legs',
  'Step Up': 'Legs',
  'Good Morning': 'Legs',
  'Sissy Squat': 'Legs',

  // Shoulders
  'Overhead Press': 'Shoulders',
  'Military Press': 'Shoulders',
  'Shoulder Press': 'Shoulders',
  'Arnold Press': 'Shoulders',
  'Lateral Raise': 'Shoulders',
  'Front Raise': 'Shoulders',
  'Reverse Fly': 'Shoulders',
  'Rear Delt': 'Shoulders',
  'Upright Row': 'Shoulders',
  'Face Pull': 'Shoulders', // duplicate intentional – face pull hits rear delt

  // Arms – Biceps
  'Preacher Curl': 'Arms',
  'Concentration Curl': 'Arms',
  'Spider Curl': 'Arms',
  'Hammer Curl': 'Arms',
  'Incline Curl': 'Arms',
  'Bicep Curl': 'Arms',
  'Biceps Curl': 'Arms',
  'Cable Curl': 'Arms',
  'Barbell Curl': 'Arms',
  'EZ Bar Curl': 'Arms',

  // Arms – Triceps
  'Skull Crusher': 'Arms',
  'Triceps Pushdown': 'Arms',
  'Tricep Pushdown': 'Arms',
  'Close Grip Bench': 'Arms',
  'Overhead Tricep Extension': 'Arms',
  'Overhead Extension': 'Arms',
  'Triceps': 'Arms',
  'Tricep': 'Arms',
  'Wrist Curl': 'Arms',
  'Close Grip': 'Arms',

  // Core
  'Cable Crunch': 'Core',
  'Crunch': 'Core',
  'Sit Up': 'Core',
  'Plank': 'Core',
  'Russian Twist': 'Core',
  'Leg Raise': 'Core',
  'Hanging Leg Raise': 'Core',
  'Toes to Bar': 'Core',
  'Ab Wheel': 'Core',
  'Wood Chop': 'Core',
  'Hyperextension': 'Core',
  'Ab ': 'Core',
};

/** Best-guess muscle group for a title, used only when seeding the library. */
export function inferMuscleGroup(exerciseTitle: string): string {
  const lower = exerciseTitle.toLowerCase();
  for (const [key, value] of Object.entries(LEGACY_MUSCLE_MAP)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  return 'Other';
}

/**
 * One-time migration. If the user has no exercises collection yet, create one
 * record per distinct exercise title found in their workout history, guessing
 * the muscle group from the legacy map. Never overwrites an existing library.
 *
 * Returns the number of exercises seeded (0 if a library already existed).
 */
export async function seedExercisesFromWorkouts(
  uid: string,
  workouts: { exerciseTitle?: string }[],
): Promise<number> {
  const exercisesRef = ref(realtimeDb, `/users/${uid}/exercises`);

  // Guard: never clobber an existing library.
  const existing = await get(exercisesRef);
  if (existing.exists()) return 0;

  const titles = Array.from(
    new Set(
      workouts
        .map((w) => w.exerciseTitle?.trim())
        .filter((t): t is string => !!t),
    ),
  );
  if (titles.length === 0) return 0;

  const payload: Record<string, { name: string; muscleGroup: string }> = {};
  titles.forEach((name) => {
    const key = push(exercisesRef).key!;
    payload[key] = { name, muscleGroup: inferMuscleGroup(name) };
  });

  console.log(`[DB] Seeding ${titles.length} exercises from workout history`);
  await set(exercisesRef, payload);
  return titles.length;
}
