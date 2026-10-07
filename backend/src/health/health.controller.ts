import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEnvelope } from '../common/api-envelope.decorator';
import { HealthModel } from './health.model';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** GET /api/health — public · data.service ต้องตรงกับ name ใน subsystem.yaml */
  @Public()
  @Get()
  @ApiEnvelope(HealthModel)
  async health() {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return { status: 'ok', service: this.config.subsystemId, database };
  }
}
