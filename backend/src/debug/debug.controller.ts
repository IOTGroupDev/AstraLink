// src/debug/debug.controller.ts
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

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
