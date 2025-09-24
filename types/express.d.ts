import { AuthObject } from '@clerk/backend';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthObject;
    }
  }
}

export {};
