import { SetMetadata } from '@nestjs/common';

import { Role } from './roles';

export const rolesMetadataKey = 'hnh_roles';

export const Roles = (...roles: Role[]) => SetMetadata(rolesMetadataKey, roles);
