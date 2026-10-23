// src/health/health.controller.ts
import {
  Controller,
  Get,
  Req,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { DevOnlyGuard } from '@/common/guards/dev-only.guard';
import { EphemerisService } from '../services/ephemeris.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly ephemeris: EphemerisService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('ready')
  async ready() {
    const ephemeris = this.ephemeris.getReadiness();
    const database = await this.prisma.healthCheck();
    const redis = this.redis.getClient()?.status === 'ready';
    const result = {
      ok:
        database && redis && ephemeris.initialized && ephemeris.filesAvailable,
      database,
      redis,
      ephemeris,
    };
    if (!result.ok) throw new ServiceUnavailableException(result);
    return result;
  }

  @Get()
  ping() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Get('ip')
  @UseGuards(DevOnlyGuard)
  ip(@Req() req: Request) {
    return { ip: req.ip, headers: req.headers };
  }
}
