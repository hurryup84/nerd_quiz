import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ToggleExcludedCategoryDto } from './dto/toggle-excluded-category.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(req.user.id, dto);
  }

  @Get('me')
  getMyTeams(@Request() req: { user: { id: number } }) {
    return this.teamsService.getMyTeams(req.user.id);
  }

  @Get('all')
  getAllTeams(@Request() req: { user: { id: number; role: string } }) {
    if (req.user.role !== 'ADMIN') {
      return this.teamsService.getMyTeams(req.user.id);
    }
    return this.teamsService.getAllTeams();
  }

  @Get('invites/me')
  getMyInvites(@Request() req: { user: { id: number } }) {
    return this.teamsService.getMyInvites(req.user.id);
  }

  @Post('invites/:id/accept')
  acceptInvite(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.acceptInvite(Number(id), req.user.id);
  }

  @Post('invites/:id/decline')
  declineInvite(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.declineInvite(Number(id), req.user.id);
  }

  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.getTeamMembers(id, req.user.id);
  }

  @Post(':id/invites')
  invite(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
    @Body() dto: InviteUserDto,
  ) {
    return this.teamsService.inviteUser(id, req.user.id, dto.username);
  }

  @Post(':id/leave')
  leave(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.leaveTeam(id, req.user.id);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Request() req: { user: { id: number; role: string } },
  ) {
    if (req.user.role === 'ADMIN') {
      return this.teamsService.deleteTeamAsAdmin(id);
    }
    return this.teamsService.deleteTeam(id, req.user.id);
  }

  @Get('invites/:id/pending')
  getPendingInvites(
    @Param('id') teamId: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.getPendingInvites(teamId, req.user.id);
  }

  @Delete('invites/:inviteId')
  revokeInvite(
    @Param('inviteId') inviteId: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.revokeInvite(Number(inviteId), req.user.id);
  }

  // ── Admin-only endpoints ──────────────────────────────────────

  @Get(':id')
  @UseGuards(AdminGuard)
  getTeam(@Param('id') id: string) {
    return this.teamsService.getTeamById(id);
  }

  @Post(':id/members')
  @UseGuards(AdminGuard)
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamsService.addMember(id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @UseGuards(AdminGuard)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(id, Number(userId));
  }

  @Post(':id/transfer')
  @UseGuards(AdminGuard)
  transferOwnership(
    @Param('id') id: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.teamsService.transferOwnership(id, dto.newOwnerId);
  }

  @Get(':id/invites/pending')
  @UseGuards(AdminGuard)
  getPendingInvitesAdmin(@Param('id') id: string) {
    return this.teamsService.getPendingInvitesAdmin(id);
  }

  @Delete('invites/:inviteId/admin')
  @UseGuards(AdminGuard)
  revokeInviteAdmin(@Param('inviteId') inviteId: string) {
    return this.teamsService.revokeInviteAdmin(Number(inviteId));
  }

  @Post(':id/exclusion')
  toggleTeamExclusion(
    @Param('id') teamId: string,
    @Request() req: { user: { id: number } },
    @Body() dto: ToggleExcludedCategoryDto,
  ) {
    return this.teamsService.toggleTeamExclusion(teamId, req.user.id, dto);
  }

  @Get(':id/exclusion')
  getExcludedCategories(
    @Param('id') teamId: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.getExcludedCategories(teamId, req.user.id);
  }

  @Post(':id/exclusion/admin')
  @UseGuards(AdminGuard)
  toggleTeamExclusionAdmin(
    @Param('id') teamId: string,
    @Body() dto: ToggleExcludedCategoryDto,
  ) {
    return this.teamsService.toggleTeamExclusionAdmin(teamId, dto);
  }

  @Get(':id/exclusion/admin')
  @UseGuards(AdminGuard)
  getExcludedCategoriesAdmin(@Param('id') teamId: string) {
    return this.teamsService.getExcludedCategoriesAdmin(teamId);
  }
}
