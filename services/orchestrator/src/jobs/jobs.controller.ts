import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CreateJobDto } from './dto/create-job.dto';
import { LeaseJobDto } from './dto/lease-job.dto';
import { JobRecord, JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Job queued' })
  createJob(@Body() dto: CreateJobDto): JobRecord {
    return this.jobsService.createJob(dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Jobs' })
  listJobs(): JobRecord[] {
    return this.jobsService.listJobs();
  }

  @Get(':jobId')
  @ApiOkResponse({ description: 'Job details' })
  getJob(@Param('jobId') jobId: string): JobRecord {
    return this.jobsService.getJob(jobId);
  }

  @Post('lease-next')
  @ApiOkResponse({ description: 'Next queued job leased to worker' })
  leaseNextJob(@Body() dto: LeaseJobDto): JobRecord {
    return this.jobsService.leaseNextJob(dto.workerId);
  }

  @Post(':jobId/running')
  @ApiOkResponse({ description: 'Job marked running' })
  markRunning(@Param('jobId') jobId: string): JobRecord {
    return this.jobsService.markRunning(jobId);
  }
}
