export interface AuthContext {
  readonly userId: string;
  readonly sessionId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}
