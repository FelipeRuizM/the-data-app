export interface WorkoutSet {
  title: string;
  startTime: Date;
  endTime?: Date;
  description: string;
  gym: string;
  avgHeartRate: number;
  people: string[];
  exerciseTitle: string;
  supersetId: string;
  exerciseNotes: string;
  setIndex: number;
  setType: 'warmup' | 'normal' | 'dropset' | 'failure' | 'feeder' | 'working';
  weightKg: number;
  reps: number;
  distanceKm: number;
  durationSeconds: number;
  rpe: number;
}
