export const TrainerAthleteStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type TrainerAthleteStatus = (typeof TrainerAthleteStatus)[keyof typeof TrainerAthleteStatus];
export const TRAINER_ATHLETE_STATUSES = Object.values(TrainerAthleteStatus);
