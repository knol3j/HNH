import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ComputePriceQuote } from './vendor-pricing.service';

export interface PersistQuoteInput {
  vendorId?: string;
  quote: ComputePriceQuote;
}

@Injectable()
export class QuoteRepository {
  private sequence = 0;

  constructor(private readonly prisma: PrismaService) {}

  async create(input: PersistQuoteInput) {
    const dto = input.quote.inputs;

    return this.prisma.computeQuote.create({
      data: {
        id: this.nextId('quote'),
        vendorId: input.vendorId,
        jobType: dto.jobType,
        gpuCount: dto.gpuCount,
        estimatedMinutes: dto.estimatedMinutes,
        gpuModel: dto.gpuModel,
        priority: dto.priority ?? 'standard',
        subtotalUsd: input.quote.subtotalUsd,
        platformFeeUsd: input.quote.platformFeeUsd,
        totalUsd: input.quote.totalUsd,
        estimatedWorkerPayoutUsd: input.quote.estimatedWorkerPayoutUsd,
        escrowReserveUsd: input.quote.totalUsd,
      },
    });
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return prefix + '_' + Date.now() + '_' + this.sequence;
  }
}
