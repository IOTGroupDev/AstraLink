import { requestLocale } from '../common/utils/request-headers.util';
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ConnectionsService } from './connections.service';
import type { SynastryResponse, CompositeResponse } from '../types';
import type { AuthenticatedRequest } from '../types/auth';
import { CreateConnectionDto } from '@/common/dto/request-validation.dto';

@ApiTags('Connections')
@Controller('connections')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую связь' })
  @ApiResponse({ status: 201, description: 'Связь создана' })
  async createConnection(
    @Request() req: AuthenticatedRequest,
    @Body() connectionData: CreateConnectionDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.connectionsService.createConnection(userId, connectionData);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список связей пользователя' })
  @ApiResponse({ status: 200, description: 'Список связей' })
  async getConnections(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.connectionsService.getConnections(userId);
  }

  @Get(':id/synastry')
  @ApiOperation({ summary: 'Получить синастрию для связи' })
  @ApiParam({ name: 'id', description: 'ID связи' })
  @ApiResponse({ status: 200, description: 'Данные синастрии' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  async getSynastry(
    @Request() req: AuthenticatedRequest,
    @Param('id') connectionId: string,
  ): Promise<SynastryResponse> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.connectionsService.getSynastry(
      userId,
      connectionId,
      requestLocale(req),
    );
  }

  @Get(':id/composite')
  @ApiOperation({ summary: 'Получить композитную карту для связи' })
  @ApiParam({ name: 'id', description: 'ID связи' })
  @ApiResponse({ status: 200, description: 'Данные композитной карты' })
  @ApiResponse({ status: 404, description: 'Связь не найдена' })
  async getComposite(
    @Request() req: AuthenticatedRequest,
    @Param('id') connectionId: string,
  ): Promise<CompositeResponse> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.connectionsService.getComposite(
      userId,
      connectionId,
      requestLocale(req),
    );
  }
}
