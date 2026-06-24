import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { EnvConfig } from '../common/config/env.schema';
import { apiKeyHeaderName, Role, roleHeaderName } from './roles';
import { signedRouteMetadataKey } from './signed.decorator';
import { NonceStore } from './nonce.store';
import { maxSignatureAgeSeconds, nonceHeaderName, signatureHeaderName, timestampHeaderName } from './signature.headers';
import { SignatureService } from './signature.service';

@Injectable()
export class RequestSigningGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly nonceStore: NonceStore,
    private readonly signatures: SignatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSignature = this.reflector.getAllAndOverride<boolean>(signedRouteMetadataKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresSignature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.header(roleHeaderName) as Role | undefined;
    const apiKey = request.header(apiKeyHeaderName);
    const timestamp = request.header(timestampHeaderName);
    const nonce = request.header(nonceHeaderName);
    const signature = request.header(signatureHeaderName);

    if (!role || !apiKey || !timestamp || !nonce || !signature) {
      throw new UnauthorizedException('Missing HashNHedge signing headers');
    }

    this.assertFreshTimestamp(timestamp);

    const nonceAccepted = await this.nonceStore.remember(`${role}:${apiKey}`, nonce, maxSignatureAgeSeconds);

    if (!nonceAccepted) {
      throw new UnauthorizedException('Replay detected for HashNHedge signed request');
    }

    const secret = this.getExpectedApiKey(role);
    const payload = this.signatures.buildPayload(request.method, request.originalUrl ?? request.url, timestamp, nonce, request.body);

    if (!this.signatures.verify(payload, secret, signature)) {
      throw new UnauthorizedException('Invalid HashNHedge request signature');
    }

    return true;
  }

  private assertFreshTimestamp(timestamp: string): void {
    const timestampMs = Number(timestamp) * 1000;

    if (!Number.isFinite(timestampMs)) {
      throw new UnauthorizedException('Invalid HashNHedge timestamp');
    }

    const ageSeconds = Math.abs(Date.now() - timestampMs) / 1000;

    if (ageSeconds > maxSignatureAgeSeconds) {
      throw new UnauthorizedException('HashNHedge request timestamp is outside replay window');
    }
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
