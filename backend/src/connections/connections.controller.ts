import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from './connections.service';
import type {
  CreateConnectionRequest,
  SynastryResponse,
  CompositeResponse,
} from '../types';

@ApiTags('Connections')
@Controller('connections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую связь' })
  @ApiResponse({ status: 201, description: 'Связь создана' })
  async createConnection(
    @Request() req,
    @Body() connectionData: CreateConnectionRequest,
  ) {
    return this.connectionsService.createConnection(
      req.user.userId,
      connectionData,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Получить список связей пользователя' })
  @ApiResponse({ status: 200, description: 'Список связей' })
  async getConnections(@Request() req) {
    return this.connectionsService.getConnections(req.user.userId);
  }

  @Get(':id/synastry')
  @ApiOperation({ summary: 'Получить синастрию для связи' })
  @ApiParam({ name: 'id', description: 'ID связи' })
  @ApiResponse({ status: 200, description: 'Данные синастрии' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  async getSynastry(
    @Request() req,
    @Param('id') connectionId: string,
  ): Promise<SynastryResponse> {
    return this.connectionsService.getSynastry(req.user.userId, connectionId);
  }

  @Get(':id/composite')
  @ApiOperation({ summary: 'Получить композитную карту для связи' })
  @ApiParam({ name: 'id', description: 'ID связи' })
  @ApiResponse({ status: 200, description: 'Данные композитной карты' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  async getComposite(
    @Request() req,
    @Param('id') connectionId: string,
  ): Promise<CompositeResponse> {
    return this.connectionsService.getComposite(req.user.userId, connectionId);
  }
}
