export const ExerciseTrackingType = {
  WEIGHT_REPS: 'WEIGHT_REPS',
  REPS_ONLY: 'REPS_ONLY',
  DURATION: 'DURATION',
  WEIGHT_DURATION: 'WEIGHT_DURATION',
  DISTANCE_DURATION: 'DISTANCE_DURATION',
} as const;
export type ExerciseTrackingType = (typeof ExerciseTrackingType)[keyof typeof ExerciseTrackingType];
export const EXERCISE_TRACKING_TYPES = Object.values(ExerciseTrackingType);

export const ExerciseEquipment = {
  BARBELL: 'BARBELL',
  DUMBBELL: 'DUMBBELL',
  CABLE: 'CABLE',
  MACHINE: 'MACHINE',
  BODYWEIGHT: 'BODYWEIGHT',
  BAND: 'BAND',
  KETTLEBELL: 'KETTLEBELL',
  OTHER: 'OTHER',
} as const;
export type ExerciseEquipment = (typeof ExerciseEquipment)[keyof typeof ExerciseEquipment];
export const EXERCISE_EQUIPMENT = Object.values(ExerciseEquipment);

export const ExerciseMovementPattern = {
  PUSH: 'PUSH',
  PULL: 'PULL',
  SQUAT: 'SQUAT',
  HINGE: 'HINGE',
  CARRY: 'CARRY',
  ROTATION: 'ROTATION',
  ISOLATION: 'ISOLATION',
} as const;
export type ExerciseMovementPattern = (typeof ExerciseMovementPattern)[keyof typeof ExerciseMovementPattern];
export const EXERCISE_MOVEMENT_PATTERNS = Object.values(ExerciseMovementPattern);

export const ExerciseMuscleGroupRole = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
} as const;
export type ExerciseMuscleGroupRole = (typeof ExerciseMuscleGroupRole)[keyof typeof ExerciseMuscleGroupRole];
export const EXERCISE_MUSCLE_GROUP_ROLES = Object.values(ExerciseMuscleGroupRole);
