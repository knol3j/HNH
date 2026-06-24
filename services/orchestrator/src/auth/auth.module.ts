import { Module } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { NonceStore } from './nonce.store';
import { RequestSigningGuard } from './request-signing.guard';
import { SignatureService } from './signature.service';

@Module({ providers: [AuthGuard, RequestSigningGuard, NonceStore, SignatureService], exports: [AuthGuard, RequestSigningGuard, NonceStore, SignatureService] })
export class AuthModule {}
