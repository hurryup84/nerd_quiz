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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
    @Request() req: { user: { id: number } },
  ) {
    return this.teamsService.deleteTeam(id, req.user.id);
  }
}
