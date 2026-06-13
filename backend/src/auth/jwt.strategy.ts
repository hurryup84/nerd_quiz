import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret && process.env['NODE_ENV'] === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // Try cookie first, then Authorization header as fallback for iOS cross-site issues
          return (
            req?.cookies?.token ??
            req?.cookies?.['__Host-token'] ??
            ExtractJwt.fromAuthHeaderAsBearerToken()(req) ??
            null
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret ?? 'development-secret-do-not-use-in-production',
    });
  }

  validate(payload: { sub: number; username: string; role: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
