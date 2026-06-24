import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { apiKeyHeaderName, roleHeaderName } from '../../auth/roles';
import { AuditLoggerService } from './audit-logger.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();
    const action = `${request.method} ${request.route?.path ?? request.url}`;
    const role = request.header(roleHeaderName);
    const requestId = request.header('x-request-id');

    return next.handle().pipe(
      tap(() => {
        if (this.shouldAudit(request.method)) {
          this.audit.log({
            action,
            actorRole: role,
            outcome: 'success',
            requestId,
            ip: request.ip,
            userAgent: request.header('user-agent'),
            metadata: {
              durationMs: Date.now() - startedAt,
              hasApiKey: Boolean(request.header(apiKeyHeaderName)),
            },
          });
        }
      }),
      catchError((error: Error) => {
        if (this.shouldAudit(request.method)) {
          this.audit.log({
            action,
            actorRole: role,
            outcome: 'failure',
            requestId,
            ip: request.ip,
            userAgent: request.header('user-agent'),
            metadata: {
              durationMs: Date.now() - startedAt,
              errorName: error.name,
              errorMessage: error.message,
            },
          });
        }

        return throwError(() => error);
      }),
    );
  }

  private shouldAudit(method: string): boolean {
    return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }
}
