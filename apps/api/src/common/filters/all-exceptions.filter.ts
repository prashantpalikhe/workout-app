import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Consistent error response shape returned by ALL errors.
 * The frontend can rely on this structure for error handling.
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  /** Only present for validation errors (ZodError) */
  details?: Array<{ field: string; message: string }>;
}

/**
 * Global exception filter that catches ALL unhandled exceptions
 * and returns a consistent JSON response.
 *
 * Three branches:
 * 1. ZodError      → 400 with field-level validation details
 * 2. HttpException  → preserves the status code and message
 * 3. Unknown error  → 500 "Internal server error" (no internal details leaked)
 *
 * Logging:
 * - 500s logged at "error" level (includes stack trace for debugging)
 * - 4xx logged at "warn" level (lower noise)
 *
 * Sentry integration will be added to the 500 branch in a future step.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log: 500s are errors (with stack), 4xx are warnings
    if (errorResponse.statusCode >= 500) {
      this.logger.error(exception, `Unhandled exception: ${errorResponse.message}`);
    } else {
      this.logger.warn(
        `Client error [${errorResponse.statusCode}]: ${errorResponse.message}`,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // ── Branch 1: Zod validation errors ─────────────
    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Bad Request',
        timestamp,
        path,
        details: exception.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }

    // ── Branch 2: NestJS HTTP exceptions ────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>).message?.toString() ??
            exception.message;

      return {
        statusCode: status,
        message,
        error: this.getHttpErrorName(status),
        timestamp,
        path,
      };
    }

    // ── Branch 3: Unknown errors → 500 ──────────────
    // Never leak internal details to the client.
    // The full error is logged above for debugging.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp,
      path,
    };
  }

  /** Maps HTTP status codes to human-readable error names */
  private getHttpErrorName(status: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return names[status] ?? 'Error';
  }
}
