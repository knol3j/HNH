import { VendorPricingService } from './vendor-pricing.service';

describe('VendorPricingService', () => {
  it('quotes compute jobs with platform fee and worker payout', () => {
    const service = new VendorPricingService();
    const quote = service.quote({
      jobType: 'ai-inference',
      gpuCount: 2,
      estimatedMinutes: 60,
      gpuModel: 'NVIDIA RTX 4090',
      priority: 'standard',
    });

    expect(quote.subtotalUsd).toBe(3.6);
    expect(quote.platformFeeUsd).toBe(0.54);
    expect(quote.totalUsd).toBe(4.14);
    expect(quote.estimatedWorkerPayoutUsd).toBe(3.06);
  });
});
