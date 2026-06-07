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
  // Ensure secure is true in production for cross-site cookie compatibility
  const secure =
    (process.env['COOKIE_SECURE'] ?? (isProduction ? 'true' : 'false')) ===
    'true';
  const sameSiteRaw =
    process.env['COOKIE_SAMESITE'] ?? (isProduction ? 'none' : 'lax');
  const sameSite =
    sameSiteRaw === 'none' || sameSiteRaw === 'strict' || sameSiteRaw === 'lax'
      ? sameSiteRaw
      : 'lax';

  // For iOS WebKit cross-site cookie support:
  // - Must have secure=true (requires HTTPS)
  // - Must have sameSite='none'
  // - Must have path='/' (done below)
  // - iOS may still block based on ITP heuristics if cookie is classified as tracking

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/', // Required for iOS to send cookie on all API paths
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
    const options = getCookieOptions();
    res.cookie('token', token, options);
    // Return token in body as fallback for iOS cross-site cookie issues
    return {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      token, // Include token for iOS fallback (localStorage)
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', { path: '/' });
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: number; username: string; role: string } }) {
    return req.user;
  }

  @Get('debug-cookie')
  @HttpCode(200)
  debugCookie(@Request() req: { cookies?: Record<string, string> }) {
    return {
      hasToken: !!req.cookies?.token,
      cookieNames: req.cookies ? Object.keys(req.cookies) : [],
    };
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
