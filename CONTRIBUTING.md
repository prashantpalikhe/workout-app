# Contributing

## Database Changes

The database schema is defined in Prisma (`apps/api/prisma/schema.prisma`) while shared constants, types, and validation schemas live in the `@workout/shared` package (`packages/shared/`). These are **intentionally decoupled** — changes to the Prisma schema do not auto-update the shared package.

### Adding or Removing a Column

1. **Edit the Prisma schema**
   ```
   apps/api/prisma/schema.prisma
   ```

2. **Generate and run the migration**
   ```bash
   pnpm --filter @workout/api prisma:migrate
   ```
   Prisma will prompt you for a migration name (e.g. `add_notes_to_session`). This creates a SQL migration file in `apps/api/prisma/migrations/` and regenerates the Prisma client.

3. **Update the shared Zod schema** (if the column is user-facing)
   ```
   packages/shared/src/schemas/<entity>.ts
   ```
   Add or remove the field from the relevant input schema. The inferred TypeScript type updates automatically via `z.infer<>`.

4. **Verify**
   ```bash
   pnpm build
   ```

### Adding or Removing a Table

1. **Add/remove the model** in `apps/api/prisma/schema.prisma`
2. **Run the migration**: `pnpm --filter @workout/api prisma:migrate`
3. **Create/remove the shared schema file**: `packages/shared/src/schemas/<entity>.ts`
4. **Update the barrel export**: `packages/shared/src/schemas/index.ts`
5. **Verify**: `pnpm build`

### Adding or Changing an Enum Value

Prisma enums map to `as const` objects in the shared package. Both must be updated.

1. **Edit the Prisma enum** in `apps/api/prisma/schema.prisma`
2. **Run the migration**: `pnpm --filter @workout/api prisma:migrate`
3. **Update the shared constant** in the matching file:
   ```
   packages/shared/src/constants/<domain>.ts
   ```
   Add/remove the value from the `as const` object. The union type and values array update automatically.
4. **Update any Zod schemas** that reference the enum (search for `z.enum(...)` using the constant)
5. **Verify**: `pnpm build`

### Adding a New Enum

1. **Add the enum** in `apps/api/prisma/schema.prisma`
2. **Run the migration**: `pnpm --filter @workout/api prisma:migrate`
3. **Create the constant** in `packages/shared/src/constants/<domain>.ts` following the pattern:
   ```typescript
   export const MyStatus = {
     ACTIVE: 'ACTIVE',
     INACTIVE: 'INACTIVE',
   } as const;
   export type MyStatus = (typeof MyStatus)[keyof typeof MyStatus];
   export const MY_STATUSES = Object.values(MyStatus);
   ```
4. **Export it** from `packages/shared/src/constants/index.ts`
5. **Verify**: `pnpm build`

### Common Commands

| Command | Description |
|---------|-------------|
| `pnpm --filter @workout/api prisma:migrate` | Create and apply a new migration |
| `pnpm --filter @workout/api prisma:generate` | Regenerate Prisma client (no migration) |
| `pnpm --filter @workout/api prisma:seed` | Run the seed script |
| `pnpm --filter @workout/api prisma:studio` | Open Prisma Studio (visual DB browser) |
| `pnpm --filter @workout/shared lint` | Type-check the shared package |
| `pnpm build` | Full monorepo build (includes Prisma generate) |

### File Mapping Reference

| Prisma Schema | Shared Constants | Shared Schemas |
|---------------|-----------------|----------------|
| `enum UserRole` | `constants/user.ts` → `UserRole` | `schemas/user.ts` |
| `enum UnitPreference` | `constants/user.ts` → `UnitPreference` | `schemas/user.ts` |
| `enum Gender` | `constants/user.ts` → `Gender` | `schemas/user.ts` |
| `enum Theme` | `constants/user.ts` → `Theme` | `schemas/user.ts` |
| `enum TrainerAthleteStatus` | `constants/trainer.ts` | `schemas/trainer.ts` |
| `enum ExerciseTrackingType` | `constants/exercise.ts` | `schemas/exercise.ts` |
| `enum ExerciseEquipment` | `constants/exercise.ts` | `schemas/exercise.ts` |
| `enum ExerciseMovementPattern` | `constants/exercise.ts` | `schemas/exercise.ts` |
| `enum MuscleGroupRole` | `constants/exercise.ts` | `schemas/exercise.ts` |
| `enum ProgramAssignmentStatus` | `constants/program.ts` | `schemas/program.ts` |
| `enum WorkoutSessionStatus` | `constants/session.ts` | `schemas/session.ts` |
| `enum SessionSetType` | `constants/session.ts` | `schemas/session-set.ts` |
| `enum PersonalRecordType` | `constants/record.ts` | `schemas/record.ts` |
