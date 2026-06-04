import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TeamInvite } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(userId: number, dto: CreateTeamDto) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: dto.name,
          description: dto.description,
          creatorId: userId,
        },
      });

      await tx.userTeam.create({
        data: {
          userId,
          teamId: team.id,
          role: 'OWNER',
        },
      });

      return team;
    });
  }

  async getMyTeams(userId: number) {
    return this.prisma.userTeam.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { team: { name: 'asc' } },
    });
  }

  async assertMember(userId: number, teamId: string) {
    const membership = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this team');
    }
    return membership;
  }

  async assertOwner(userId: number, teamId: string) {
    const membership = await this.assertMember(userId, teamId);
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only the team owner can perform this action',
      );
    }
    return membership;
  }

  async getTeamMembers(teamId: string, userId: number) {
    await this.assertMember(userId, teamId);

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async inviteUser(teamId: string, inviterId: number, username: string) {
    await this.assertOwner(inviterId, teamId);

    const invitee = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!invitee) {
      throw new NotFoundException('User not found');
    }
    if (invitee.id === inviterId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const existingMember = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId: invitee.id, teamId } },
    });
    if (existingMember) {
      throw new ConflictException('User is already a member of this team');
    }

    const existingInvite = await this.prisma.teamInvite.findUnique({
      where: { teamId_inviteeId: { teamId, inviteeId: invitee.id } },
    });
    if (existingInvite) {
      if (existingInvite.status === 'PENDING') {
        throw new ConflictException('User already has a pending invite');
      }
      await this.prisma.teamInvite.update({
        where: { id: existingInvite.id },
        data: { status: 'PENDING', inviterId },
      });
      return this.prisma.teamInvite.findUnique({
        where: { id: existingInvite.id },
        include: {
          team: { select: { id: true, name: true } },
          inviter: { select: { id: true, username: true } },
        },
      });
    }

    return this.prisma.teamInvite.create({
      data: {
        teamId,
        inviterId,
        inviteeId: invitee.id,
        status: 'PENDING',
      },
      include: {
        team: { select: { id: true, name: true } },
        inviter: { select: { id: true, username: true } },
      },
    });
  }

  async getMyInvites(userId: number) {
    return this.prisma.teamInvite.findMany({
      where: { inviteeId: userId, status: 'PENDING' },
      include: {
        team: { select: { id: true, name: true } },
        inviter: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvite(inviteId: number, userId: number) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.inviteeId !== userId) {
      throw new ForbiddenException('This invite is not for you');
    }
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite is no longer pending');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userTeam.create({
        data: {
          userId,
          teamId: invite.teamId,
          role: 'MEMBER',
        },
      });
      await tx.teamInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED' },
      });
      return tx.team.findUnique({
        where: { id: invite.teamId },
        include: {
          members: {
            include: { user: { select: { id: true, username: true } } },
          },
        },
      });
    });
  }

  async declineInvite(inviteId: number, userId: number) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.inviteeId !== userId) {
      throw new ForbiddenException('This invite is not for you');
    }
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite is no longer pending');
    }

    return this.prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: 'DECLINED' },
    });
  }

  async leaveTeam(teamId: string, userId: number) {
    const membership = await this.assertMember(userId, teamId);
    if (membership.role === 'OWNER') {
      throw new BadRequestException(
        'Owners cannot leave the team. Delete the team instead.',
      );
    }

    return this.prisma.userTeam.delete({
      where: { userId_teamId: { userId, teamId } },
    });
  }

  async deleteTeam(teamId: string, userId: number) {
    await this.assertOwner(userId, teamId);

    const activeRound = await this.prisma.quizRound.findFirst({
      where: { teamId, status: 'ACTIVE' },
    });
    if (activeRound) {
      throw new ConflictException(
        'Cannot delete team while it has an active quiz round',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teamInvite.deleteMany({ where: { teamId } });
      await tx.userTeam.deleteMany({ where: { teamId } });
      return tx.team.delete({ where: { id: teamId } });
    });
  }

  async isMember(userId: number, teamId: string): Promise<boolean> {
    const membership = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    return !!membership;
  }

  async getAllTeams() {
    const teams = await this.prisma.team.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        creator: { select: { id: true, username: true } },
        members: {
          select: {
            userId: true,
            role: true,
            user: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((team) => ({
      ...team,
      memberCount: team.members.length,
    }));
  }

  async getTeamById(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        creator: { select: { id: true, username: true } },
        members: {
          select: {
            userId: true,
            role: true,
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!team) throw new NotFoundException('Team not found');

    return {
      ...team,
      memberCount: team.members.length,
    };
  }

  async addMember(teamId: string, userId: number) {
    // Check team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Check user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Check not already a member
    const existing = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this team');
    }

    return this.prisma.userTeam.create({
      data: { userId, teamId, role: 'MEMBER' },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async removeMember(teamId: string, userId: number) {
    // Check team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Check membership exists
    const membership = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this team');
    }

    // Prevent removing the owner unless there's another owner or we handle carefully
    if (membership.role === 'OWNER') {
      throw new BadRequestException(
        'Cannot remove the team owner. Transfer ownership first.',
      );
    }

    return this.prisma.userTeam.delete({
      where: { userId_teamId: { userId, teamId } },
    });
  }

  async transferOwnership(teamId: string, newOwnerId: number) {
    // Check team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Check new owner is a member
    const membership = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId: newOwnerId, teamId } },
    });
    if (!membership) {
      throw new BadRequestException('New owner must be a member of the team');
    }

    // Update role to OWNER
    return this.prisma.userTeam.update({
      where: { userId_teamId: { userId: newOwnerId, teamId } },
      data: { role: 'OWNER' },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async deleteTeamAsAdmin(teamId: string) {
    // Check team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const activeRound = await this.prisma.quizRound.findFirst({
      where: { teamId, status: 'ACTIVE' },
    });
    if (activeRound) {
      throw new ConflictException(
        'Cannot delete team while it has an active quiz round',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teamInvite.deleteMany({ where: { teamId } });
      await tx.userTeam.deleteMany({ where: { teamId } });
      return tx.team.delete({ where: { id: teamId } });
    });
  }

  async getPendingInvites(teamId: string, userId: number): Promise<TeamInvite[]> {
    // Ensure the user is the owner of the team
    await this.assertOwner(userId, teamId);

    // Fetch pending invites for this team
    return this.prisma.teamInvite.findMany({
      where: { teamId, status: 'PENDING' },
      include: {
        team: { select: { id: true, name: true } },
        inviter: { select: { id: true, username: true } },
        invitee: { select: { id: true, username: true } },
      },
    });
  }

  async getPendingInvitesAdmin(teamId: string) {
    // Check team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.teamInvite.findMany({
      where: { teamId, status: 'PENDING' },
      include: {
        team: { select: { id: true, name: true } },
        inviter: { select: { id: true, username: true } },
        invitee: { select: { id: true, username: true } },
      },
    });
  }

  async revokeInvite(inviteId: number, userId: number): Promise<TeamInvite> {
    // Ensure the user is the owner of the team that sent the invite
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { team: true },
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Only pending invites can be revoked');
    }
    // Verify that the caller is the inviter (owner) of the team
    await this.assertOwner(userId, invite.teamId);

    // Delete the invite
    return this.prisma.teamInvite.delete({
      where: { id: inviteId },
    });
  }

  async revokeInviteAdmin(inviteId: number): Promise<TeamInvite> {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Only pending invites can be revoked');
    }

    return this.prisma.teamInvite.delete({
      where: { id: inviteId },
    });
  }
}
