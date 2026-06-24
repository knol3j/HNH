import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { RequestSigningGuard } from '../auth/request-signing.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles';
import { SignedRoute } from '../auth/signed.decorator';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { WorkerRecord, WorkersService } from './workers.service';

@ApiTags('workers')
@ApiSecurity('x-hnh-api-key')
@Controller('workers')
@UseGuards(AuthGuard, RequestSigningGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post()
  @SignedRoute()
  @Roles(Role.Worker, Role.Admin)
  @ApiCreatedResponse({ description: 'Worker registered or refreshed' })
  registerWorker(@Body() dto: RegisterWorkerDto): Promise<WorkerRecord> {
    return this.workersService.registerWorker(dto);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOkResponse({ description: 'Registered workers' })
  listWorkers(): Promise<WorkerRecord[]> {
    return this.workersService.listWorkers();
  }

  @Get(':workerId')
  @Roles(Role.Admin, Role.Worker)
  @ApiOkResponse({ description: 'Worker details' })
  getWorker(@Param('workerId') workerId: string): Promise<WorkerRecord> {
    return this.workersService.getWorker(workerId);
  }

  @Post(':workerId/heartbeat')
  @SignedRoute()
  @Roles(Role.Worker, Role.Admin)
  @ApiOkResponse({ description: 'Worker heartbeat accepted' })
  heartbeat(@Param('workerId') workerId: string, @Body() dto: HeartbeatDto): Promise<WorkerRecord> {
    return this.workersService.heartbeat(workerId, dto);
  }
}
