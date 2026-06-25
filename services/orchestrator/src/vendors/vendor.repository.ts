import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

export interface PersistedVendorRecord {
  id: string;
  name: string;
  contactEmail: string;
  walletAddress?: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class VendorRepository {
  private sequence = 0;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVendorDto): Promise<PersistedVendorRecord> {
    return this.prisma.vendor.create({
      data: {
        id: this.nextId('vendor'),
        name: dto.name,
        contactEmail: dto.contactEmail,
        walletAddress: dto.walletAddress,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async list(): Promise<PersistedVendorRecord[]> {
    return this.prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return prefix + '_' + Date.now() + '_' + this.sequence;
  }
}
