import { Users_role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Users_role | string;
      };
    }
  }
}
