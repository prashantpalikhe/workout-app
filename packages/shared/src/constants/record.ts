export const PersonalRecordType = {
  ONE_REP_MAX: 'ONE_REP_MAX',
  MAX_REPS: 'MAX_REPS',
  MAX_WEIGHT: 'MAX_WEIGHT',
  MAX_VOLUME: 'MAX_VOLUME',
} as const;
export type PersonalRecordType = (typeof PersonalRecordType)[keyof typeof PersonalRecordType];
export const PERSONAL_RECORD_TYPES = Object.values(PersonalRecordType);

/** Maps exercise tracking type → applicable PR types */
export const PR_TYPES_BY_TRACKING_TYPE: Record<string, PersonalRecordType[]> = {
  WEIGHT_REPS: [PersonalRecordType.ONE_REP_MAX, PersonalRecordType.MAX_WEIGHT, PersonalRecordType.MAX_REPS, PersonalRecordType.MAX_VOLUME],
  REPS_ONLY: [PersonalRecordType.MAX_REPS],
  DURATION: [],
  WEIGHT_DURATION: [PersonalRecordType.MAX_WEIGHT],
  DISTANCE_DURATION: [],
};

/** Priority order for assigning sessionSetId (highest first) */
export const PR_TYPE_PRIORITY: PersonalRecordType[] = [
  PersonalRecordType.ONE_REP_MAX,
  PersonalRecordType.MAX_WEIGHT,
  PersonalRecordType.MAX_VOLUME,
  PersonalRecordType.MAX_REPS,
];
