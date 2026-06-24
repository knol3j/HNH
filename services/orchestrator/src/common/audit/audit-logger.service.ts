import { Injectable, Logger } from '@nestjs/common';

import { redactObject } from '../redaction/redactor';

export interface AuditEvent {
  action: string;
  actorRole?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  outcome: 'success' | 'failure' | 'denied';
  requestId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger('Audit');

  log(event: AuditEvent): void {
    const payload = redactObject({
      ...event,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(JSON.stringify(payload));
  }
}
