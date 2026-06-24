import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { EnvConfig } from '../common/config/env.schema';
import { apiKeyHeaderName, roleHeaderName, Role } from './roles';
import { rolesMetadataKey } from './roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(rolesMetadataKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.header(roleHeaderName) as Role | undefined;
    const apiKey = request.header(apiKeyHeaderName);

    if (!role || !apiKey) {
      throw new UnauthorizedException('Missing HashNHedge role or API key header');
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Role ${role} cannot access this resource`);
    }

    const expectedKey = this.getExpectedApiKey(role);

    if (apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid HashNHedge API key');
    }

    return true;
  }

  private getExpectedApiKey(role: Role): string {
    switch (role) {
      case Role.Admin:
        return this.config.get('ADMIN_API_KEY', { infer: true });
      case Role.Worker:
        return this.config.get('WORKER_API_KEY', { infer: true });
      case Role.Vendor:
        return this.config.get('VENDOR_API_KEY', { infer: true });
    }
  }
}
