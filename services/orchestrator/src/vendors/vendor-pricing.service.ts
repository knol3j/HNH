import { Injectable } from '@nestjs/common';

import { PriceComputeDto } from './dto/price-compute.dto';

export interface ComputePriceQuote {
  currency: 'USD';
  subtotalUsd: number;
  platformFeeUsd: number;
  totalUsd: number;
  estimatedWorkerPayoutUsd: number;
  inputs: PriceComputeDto;
}

@Injectable()
export class VendorPricingService {
  quote(dto: PriceComputeDto): ComputePriceQuote {
    const hourlyRate = this.hourlyRate(dto.gpuModel);
    const priorityMultiplier = this.priorityMultiplier(dto.priority ?? 'standard');
    const hours = dto.estimatedMinutes / 60;
    const subtotalUsd = roundMoney(hourlyRate * dto.gpuCount * hours * priorityMultiplier);
    const platformFeeUsd = roundMoney(subtotalUsd * 0.15);
    const totalUsd = roundMoney(subtotalUsd + platformFeeUsd);
    const estimatedWorkerPayoutUsd = roundMoney(subtotalUsd * 0.85);

    return {
      currency: 'USD',
      subtotalUsd,
      platformFeeUsd,
      totalUsd,
      estimatedWorkerPayoutUsd,
      inputs: dto,
    };
  }

  private hourlyRate(gpuModel?: string): number {
    const normalized = gpuModel?.toLowerCase() ?? '';

    if (normalized.includes('4090')) return 1.8;
    if (normalized.includes('a100')) return 4.5;
    if (normalized.includes('h100')) return 8.5;
    return 1.25;
  }

  private priorityMultiplier(priority: 'economy' | 'standard' | 'priority'): number {
    if (priority === 'economy') return 0.8;
    if (priority === 'priority') return 1.5;
    return 1;
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
