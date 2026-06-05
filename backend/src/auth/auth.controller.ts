import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  Get,
  Put,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { IsString, MinLength } from 'class-validator';

class RegisterDto {
  @IsString() username!: string;
  @IsString() @MinLength(4) password!: string;
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(4) newPassword!: string;
}

function getCookieOptions() {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const secure =
    (process.env['COOKIE_SECURE'] ?? (isProduction ? 'true' : 'false')) ===
    'true';
  const sameSiteRaw =
    process.env['COOKIE_SAMESITE'] ?? (isProduction ? 'none' : 'lax');
  const sameSite =
    sameSiteRaw === 'none' || sameSiteRaw === 'strict' || sameSiteRaw === 'lax'
      ? sameSiteRaw
      : 'lax';

  // Note: we explicitly do NOT set `domain` here because:
  // - In production, omitting domain scopes the cookie to the exact backend hostname
  // - Setting domain would incorrectly point it to the frontend (cross-site)
  // - The browser handles this correctly when both are on render.com domains

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 15 * 60 * 1000,
    path: '/', // Required for iOS Safari to send cookie on all paths
  } as const;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto.username, dto.password);
    return { id: user.id, username: user.username, role: user.role };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Request() req: { user: { id: number; username: string; role: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.login(req.user);
    res.cookie('token', token, getCookieOptions());
    return {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', getCookieOptions());
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: number; username: string; role: string } }) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  async changePassword(
    @Request() req: { user: { id: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed' };
  }
}
