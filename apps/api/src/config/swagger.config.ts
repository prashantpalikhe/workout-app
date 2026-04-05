import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Swagger/OpenAPI configuration.
 *
 * - Serves interactive API docs at /api/docs
 * - Pre-configures JWT bearer auth so you can test protected
 *   endpoints directly from the Swagger UI
 * - Version will be bumped as features are added
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('Workout App API')
  .setDescription(
    'API for the workout tracking platform for athletes and trainers',
  )
  .setVersion('0.1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter your JWT access token',
    },
    'access-token', // This name is used in @ApiBearerAuth('access-token') on controllers
  )
  .build();
