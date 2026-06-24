import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { RequestSigningGuard } from '../auth/request-signing.guard';
import { Role } from '../auth/roles';
import { Roles } from '../auth/roles.decorator';
import { SignedRoute } from '../auth/signed.decorator';
import { CircuitBreakerName, CircuitBreakerState, CircuitBreakerStore } from '../common/safety/circuit-breaker.store';
import { breakerNames, UpdateBreakerDto } from './dto/update-breaker.dto';

@ApiTags('admin')
@ApiSecurity('x-hnh-api-key')
@Controller('admin')
@UseGuards(AuthGuard, RequestSigningGuard)
export class AdminController {
  constructor(private readonly breakers: CircuitBreakerStore) {}

  @Get('circuit-breakers')
  @Roles(Role.Admin)
  @ApiOkResponse({ description: 'Circuit breaker states' })
  listBreakers(): Promise<CircuitBreakerState[]> {
    return this.breakers.list();
  }

  @Put('circuit-breakers/:name')
  @SignedRoute()
  @Roles(Role.Admin)
  @ApiOkResponse({ description: 'Circuit breaker state updated' })
  updateBreaker(@Param('name') name: CircuitBreakerName, @Body() dto: UpdateBreakerDto): Promise<CircuitBreakerState> {
    if (!breakerNames.includes(name)) {
      throw new Error(`Unknown circuit breaker: ${name}`);
    }

    if (dto.state === 'open') {
      return this.breakers.open(name, dto.reason ?? 'manual_admin_action', dto.actorId);
    }

    return this.breakers.close(name);
  }
}
