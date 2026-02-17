import { env } from "@/lib/env";
import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export class JWTUtil {
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET_ACCESS, {
      expiresIn: env.ACCESS_TOKEN_EXPIRY && "15m",
    });
  }

  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.REFRESH_TOKEN_EXPIRY, {
      expiresIn: env.REFRESH_TOKEN_EXPIRY && "7d",
    });
  }

  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET_ACCESS) as JWTPayload;
  }

  static verifyRefreshToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET_REFRESH) as JWTPayload;
  }

  static decode(token: string): JWTPayload | null {
    return jwt.decode(token) as JWTPayload | null;
  }
}
