import { Injectable } from '@nestjs/common';

import { CreateVendorDto } from './dto/create-vendor.dto';

export interface VendorRecord {
  id: string;
  name: string;
  contactEmail: string;
  walletAddress?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class VendorsService {
  private readonly vendors = new Map<string, VendorRecord>();
  private sequence = 0;

  createVendor(dto: CreateVendorDto): VendorRecord {
    const id = this.nextId();
    const vendor: VendorRecord = {
      id,
      name: dto.name,
      contactEmail: dto.contactEmail,
      walletAddress: dto.walletAddress,
      metadata: dto.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.vendors.set(id, vendor);
    return vendor;
  }

  listVendors(): VendorRecord[] {
    return Array.from(this.vendors.values());
  }

  private nextId(): string {
    this.sequence += 1;
    return 'vendor_' + Date.now() + '_' + this.sequence;
  }
}
