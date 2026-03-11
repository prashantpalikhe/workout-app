/**
 * Shape of the JWT access token payload.
 * "sub" is the standard JWT claim for subject (user ID).
 */
export interface JwtPayload {
  sub: string; // user ID (UUID)
  email: string;
  isTrainer: boolean;
}
