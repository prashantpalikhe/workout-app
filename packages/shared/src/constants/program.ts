export const ProgramAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ProgramAssignmentStatus = (typeof ProgramAssignmentStatus)[keyof typeof ProgramAssignmentStatus];
export const PROGRAM_ASSIGNMENT_STATUSES = Object.values(ProgramAssignmentStatus);
