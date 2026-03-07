export const WorkoutSessionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;
export type WorkoutSessionStatus = (typeof WorkoutSessionStatus)[keyof typeof WorkoutSessionStatus];
export const WORKOUT_SESSION_STATUSES = Object.values(WorkoutSessionStatus);

export const SessionSetType = {
  WARM_UP: 'WARM_UP',
  WORKING: 'WORKING',
  BACK_OFF: 'BACK_OFF',
  DROP: 'DROP',
  FAILURE: 'FAILURE',
  AMRAP: 'AMRAP',
} as const;
export type SessionSetType = (typeof SessionSetType)[keyof typeof SessionSetType];
export const SESSION_SET_TYPES = Object.values(SessionSetType);
