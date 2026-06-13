import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(username: string, password: string, role = 'USER') {
    // Normalize and check for existing username
    const normalizedUsername = username.trim();
    const existing = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM User WHERE LOWER(username) = ${normalizedUsername.toLowerCase()}
    `;
    if (existing.length > 0) throw new ConflictException('Username already taken');
    const passwordHash = await argon2.hash(password);
    return this.prisma.user.create({
      data: { username: normalizedUsername, passwordHash, role },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { username: 'asc' },
    });
  }

  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: { username: { contains: query } },
      select: { id: true, username: true, role: true },
      take: 20,
    });
  }

  async remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  async updateRole(id: number, role: string) {
    const validRoles = ['USER', 'ADMIN', 'IMPORTER'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new ConflictException('User not found');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new ConflictException('Current password is incorrect');
    const passwordHash = await argon2.hash(newPassword);
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
