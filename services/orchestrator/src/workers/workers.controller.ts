import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { HeartbeatDto } from './dto/heartbeat.dto';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { WorkerRecord, WorkersService } from './workers.service';

@ApiTags('workers')
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Worker registered or refreshed' })
  registerWorker(@Body() dto: RegisterWorkerDto): WorkerRecord {
    return this.workersService.registerWorker(dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Registered workers' })
  listWorkers(): WorkerRecord[] {
    return this.workersService.listWorkers();
  }

  @Get(':workerId')
  @ApiOkResponse({ description: 'Worker details' })
  getWorker(@Param('workerId') workerId: string): WorkerRecord {
    return this.workersService.getWorker(workerId);
  }

  @Post(':workerId/heartbeat')
  @ApiOkResponse({ description: 'Worker heartbeat accepted' })
  heartbeat(@Param('workerId') workerId: string, @Body() dto: HeartbeatDto): WorkerRecord {
    return this.workersService.heartbeat(workerId, dto);
  }
}
