// src/debug/debug.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { DevOnlyGuard } from '@/common/guards/dev-only.guard';

// Debug endpoints - restricted to development environment only
@Public()
@UseGuards(DevOnlyGuard)
@Controller('debug')
export class DebugController {
  @Get('headers')
  headers(@Req() req: Request) {
    return {
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
    };
  }
}
