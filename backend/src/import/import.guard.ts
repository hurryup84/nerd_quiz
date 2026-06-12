import { Injectable, ForbiddenException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ImporterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    // Check if user exists and has admin or importer role
    if (!request.user || (request.user.role !== 'ADMIN' && request.user.role !== 'IMPORTER')) {
      throw new ForbiddenException('Importer or Admin role required');
    }
    return true;
  }
}