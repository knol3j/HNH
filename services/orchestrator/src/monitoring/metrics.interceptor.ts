import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => this.observe(request, response.statusCode, start)),
      catchError((error: Error) => {
        this.observe(request, response.statusCode >= 400 ? response.statusCode : 500, start);
        return throwError(() => error);
      }),
    );
  }

  private observe(request: Request, statusCode: number, start: bigint): void {
    const route = request.route?.path ?? request.url;
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const labels = {
      method: request.method,
      route,
      status: String(statusCode),
    };

    this.metrics.httpRequests.inc(labels);
    this.metrics.httpDuration.observe(labels, durationSeconds);
  }
}
