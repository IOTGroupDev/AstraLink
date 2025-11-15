// src/debug/debug.controller.ts
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';

// Debug endpoints are public for development/testing purposes
@Public()
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
