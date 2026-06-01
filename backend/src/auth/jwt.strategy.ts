import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] ?? 'change-me-in-production',
    });
  }

  async validate(payload: { sub: number; username: string; role: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
