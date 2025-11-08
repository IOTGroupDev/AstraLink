// src/health/health.controller.ts
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('health')
export class HealthController {
  @Get()
  ping() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Get('ip')
  ip(@Req() req: Request) {
    return { ip: req.ip, headers: req.headers };
  }
}
