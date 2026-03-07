import { toJSONSchema } from 'zod';
import type { ZodSchema } from 'zod';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Converts a Zod schema to an OpenAPI-compatible schema object.
 * Uses Zod v4's built-in `toJSONSchema()` and strips the `$schema` key
 * which isn't valid in OpenAPI's inline schema definitions.
 */
export function zodToOpenApi(schema: ZodSchema): SchemaObject {
  const { $schema, ...rest } = toJSONSchema(schema) as Record<string, unknown>;
  return rest as SchemaObject;
}
