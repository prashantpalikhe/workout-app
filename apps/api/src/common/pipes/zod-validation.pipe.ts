import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * NestJS pipe that validates input against a Zod schema.
 *
 * Usage in a controller:
 * ```ts
 * @Post()
 * create(@Body(new ZodValidationPipe(createExerciseInputSchema)) data: CreateExerciseInput) {
 *   // "data" is validated AND transformed (Zod applies coercions/defaults)
 * }
 * ```
 *
 * On validation failure, throws ZodError → caught by AllExceptionsFilter
 * → returns 400 with field-level error details.
 *
 * Works with @Body(), @Query(), @Param() — any NestJS parameter decorator.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    // parse() throws ZodError on failure (handled by AllExceptionsFilter).
    // On success, returns the parsed & transformed value (with coercions and defaults applied).
    return this.schema.parse(value);
  }
}
