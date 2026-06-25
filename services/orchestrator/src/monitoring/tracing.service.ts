import { Injectable, Logger } from '@nestjs/common';

export interface TraceMetadata {
  jobId?: string;
  workerId?: string;
  requesterId?: string;
  status?: string;
  [key: string]: unknown;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger('Trace');

  trace(eventName: string, metadata: TraceMetadata = {}): void {
    this.logger.log(
      JSON.stringify({
        eventName,
        metadata,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
