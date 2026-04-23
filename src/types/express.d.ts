import type { UserRole } from "./roles.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole; email: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validatedBody?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validatedQuery?: any;
    }
  }
}

export {};
