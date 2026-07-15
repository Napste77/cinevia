declare namespace Express {
  export interface Request {
    /** Seteado por optionalAuth/requireAuth cuando el Bearer token es válido. */
    userId?: number;
  }
}
