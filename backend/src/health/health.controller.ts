// src/health/health.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { DevOnlyGuard } from '@/common/guards/dev-only.guard';

@Public()
@Controller('health')
export class HealthController {
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
