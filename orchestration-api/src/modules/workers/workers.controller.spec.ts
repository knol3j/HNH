import { Test, TestingModule } from '@nestjs/testing';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { RegisterWorkerDto, UpdateWorkerGpuDto } from './dto';

describe('WorkersController', () => {
  let controller: WorkersController;
  let service: WorkersService;

  const mockWorkersService = {
    register: jest.fn(),
    updateGpuInfo: jest.fn(),
    getGpuStats: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkersController],
      providers: [
        { provide: WorkersService, useValue: mockWorkersService },
      ],
    }).compile();

    controller = module.get<WorkersController>(WorkersController);
    service = module.get<WorkersService>(WorkersService);

    jest.clearAllMocks();
  });

  describe('POST /workers/register', () => {
    it('should call service.register with dto', async () => {
      const dto: RegisterWorkerDto = {
        walletAddress: 'HN7hnF3n7R6n7n7n7n7n7n7n7n7n7n7n7n7n7n7n7n',
        gpuInfo: { count: 2, model: 'RTX 4090' },
      };

      const expectedResult = {
        workerId: 'worker_abc123',
        walletAddress: dto.walletAddress,
        status: 'active',
      };
      mockWorkersService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('POST /workers/:workerId/gpu', () => {
    it('should call service.updateGpuInfo with workerId and dto', async () => {
      const workerId = 'worker_abc123';
      const dto: UpdateWorkerGpuDto = {
        count: 4,
        model: 'RTX 4090',
        utilization: 85,
      };

      const expectedResult = {
        workerId,
        gpuCount: 4,
        gpuModel: 'RTX 4090',
      };
      mockWorkersService.updateGpuInfo.mockResolvedValue(expectedResult);

      const result = await controller.updateGpu(workerId, dto);

      expect(service.updateGpuInfo).toHaveBeenCalledWith(workerId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /workers/gpu/stats', () => {
    it('should call service.getGpuStats', async () => {
      const expectedResult = {
        totalWorkers: 10,
        gpuWorkers: 8,
        totalGpus: 24,
        models: { 'RTX 4090': 16, 'RTX 3090': 8 },
      };
      mockWorkersService.getGpuStats.mockResolvedValue(expectedResult);

      const result = await controller.getGpuStats();

      expect(service.getGpuStats).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /workers/:workerId', () => {
    it('should call service.findOne with workerId', async () => {
      const workerId = 'worker_abc123';
      const expectedResult = {
        workerId,
        walletAddress: 'addr1',
        status: 'active',
      };
      mockWorkersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.getWorker(workerId);

      expect(service.findOne).toHaveBeenCalledWith(workerId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /workers', () => {
    it('should call service.findAll', async () => {
      const expectedResult = [
        { workerId: 'worker_1', status: 'active' },
        { workerId: 'worker_2', status: 'active' },
      ];
      mockWorkersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.listWorkers();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});
