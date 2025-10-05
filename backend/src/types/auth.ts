import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  userId?: string;
  sub?: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
