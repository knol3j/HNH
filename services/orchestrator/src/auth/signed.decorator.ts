import { SetMetadata } from '@nestjs/common';

export const signedRouteMetadataKey = 'hnh_signed_route';

export const SignedRoute = () => SetMetadata(signedRouteMetadataKey, true);
