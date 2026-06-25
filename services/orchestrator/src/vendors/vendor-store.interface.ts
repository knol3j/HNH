import { CreateVendorDto } from './dto/create-vendor.dto';
import { ComputePriceQuote } from './vendor-pricing.service';

export interface VendorRecord {
  id: string;
  name: string;
  contactEmail: string;
  walletAddress?: string | null;
  metadata: Record<string, unknown> | unknown;
  createdAt: string | Date;
}

export interface VendorStore {
  createVendor(dto: CreateVendorDto): Promise<VendorRecord> | VendorRecord;
  listVendors(): Promise<VendorRecord[]> | VendorRecord[];
}

export interface QuoteStore {
  createQuote(input: { vendorId?: string; quote: ComputePriceQuote }): Promise<unknown> | unknown;
}
