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
  @IsString() @MinLength(8) password!: string;
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000,
};

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
    res.cookie('token', token, COOKIE_OPTIONS);
    return { id: req.user.id, username: req.user.username, role: req.user.role };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
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
