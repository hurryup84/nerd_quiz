import { Injectable, ForbiddenException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ImporterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    if (request.user?.role !== 'ADMIN' && request.user?.role !== 'IMPORTER') {
      throw new ForbiddenException('Importer role required');
    }
    return true;
  }
}