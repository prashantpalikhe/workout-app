/**
 * Strip baseline personal records from session/exercise responses.
 * Baseline PRs (first-ever result for an exercise) are stored internally
 * but should not be displayed as achievements.
 */

type SetWithPR = {
  personalRecord: {
    id: string;
    prType: string;
    value: number;
    isBaseline: boolean;
  } | null;
  [key: string]: unknown;
};

type ExerciseWithSets = {
  sets: SetWithPR[];
  [key: string]: unknown;
};

/** Normalize a single set: null out baseline personalRecord */
export function normalizeSet<T extends SetWithPR>(set: T): T {
  if (set.personalRecord?.isBaseline) {
    return { ...set, personalRecord: null };
  }
  if (set.personalRecord) {
    const { isBaseline: _, ...pr } = set.personalRecord;
    return { ...set, personalRecord: pr };
  }
  return set;
}

/** Normalize a session exercise: strip baselines from all sets */
export function normalizeExercise<T extends ExerciseWithSets>(exercise: T): T {
  return { ...exercise, sets: exercise.sets.map(normalizeSet) };
}

/** Normalize a full session: strip baselines from all exercises' sets */
export function normalizeSession<
  T extends { sessionExercises: ExerciseWithSets[] },
>(session: T): T {
  return {
    ...session,
    sessionExercises: session.sessionExercises.map(normalizeExercise),
  };
}
