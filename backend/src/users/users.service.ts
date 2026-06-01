import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(username: string, password: string, role = 'USER') {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new ConflictException('Username already taken');
    const passwordHash = await argon2.hash(password);
    return this.prisma.user.create({
      data: { username, passwordHash, role },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ConflictException('User not found');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new ConflictException('Current password is incorrect');
    const passwordHash = await argon2.hash(newPassword);
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
