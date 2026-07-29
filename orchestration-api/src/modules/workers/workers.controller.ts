import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import { RegisterWorkerDto, UpdateWorkerGpuDto } from './dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post('register')
  @Roles(UserRole.MINER, UserRole.ADMIN)
  async register(@Body() registerDto: RegisterWorkerDto) {
    return this.workersService.register(registerDto);
  }

  @Post(':workerId/gpu')
  @Roles(UserRole.MINER, UserRole.ADMIN)
  async updateGpu(
    @Param('workerId') workerId: string,
    @Body() gpuDto: UpdateWorkerGpuDto,
  ) {
    return this.workersService.updateGpuInfo(workerId, gpuDto);
  }

  @Get('gpu/stats')
  @Roles(UserRole.ADMIN)
  async getGpuStats() {
    return this.workersService.getGpuStats();
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async listWorkers() {
    return this.workersService.findAll();
  }

  @Get(':workerId')
  async getWorker(@Param('workerId') workerId: string) {
    return this.workersService.findOne(workerId);
  }
}
