import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import { RequestSigningGuard } from '../auth/request-signing.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles';
import { SignedRoute } from '../auth/signed.decorator';
import { CreateJobDto } from './dto/create-job.dto';
import { LeaseJobDto } from './dto/lease-job.dto';
import { JobRecord, JobsService, RecoverySummary } from './jobs.service';

@ApiTags('jobs')
@ApiSecurity('x-hnh-api-key')
@Controller('jobs')
@UseGuards(AuthGuard, RequestSigningGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @SignedRoute()
  @Roles(Role.Vendor, Role.Admin)
  @ApiCreatedResponse({ description: 'Job queued' })
  createJob(@Body() dto: CreateJobDto): Promise<JobRecord> {
    return this.jobsService.createJob(dto);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOkResponse({ description: 'Jobs' })
  listJobs(): Promise<JobRecord[]> {
    return this.jobsService.listJobs();
  }

  @Get(':jobId')
  @Roles(Role.Admin, Role.Vendor, Role.Worker)
  @ApiOkResponse({ description: 'Job details' })
  getJob(@Param('jobId') jobId: string): Promise<JobRecord> {
    return this.jobsService.getJob(jobId);
  }

  @Post('lease-next')
  @SignedRoute()
  @Roles(Role.Worker, Role.Admin)
  @ApiOkResponse({ description: 'Next queued job leased to worker' })
  leaseNextJob(@Body() dto: LeaseJobDto): Promise<JobRecord> {
    return this.jobsService.leaseNextJob(dto.workerId);
  }

  @Post('recover-expired-leases')
  @SignedRoute()
  @Roles(Role.Admin)
  @ApiOkResponse({ description: 'Expired leases processed' })
  recoverExpiredLeases(): Promise<RecoverySummary> {
    return this.jobsService.recoverExpiredLeases();
  }

  @Post(':jobId/running')
  @SignedRoute()
  @Roles(Role.Worker, Role.Admin)
  @ApiOkResponse({ description: 'Job marked running' })
  markRunning(@Param('jobId') jobId: string): Promise<JobRecord> {
    return this.jobsService.markRunning(jobId);
  }
}
