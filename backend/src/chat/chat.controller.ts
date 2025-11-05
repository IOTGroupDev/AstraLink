import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

interface SendMessageBody {
  recipientId: string;
  text?: string;
  mediaPath?: string | null;
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages/send')
  @ApiOperation({ summary: 'Отправить сообщение пользователю' })
  @ApiResponse({ status: 201, description: 'Сообщение отправлено' })
  async sendMessage(@Request() req: any, @Body() body: SendMessageBody) {
    const token = this.getAccessToken(req);
    if (!body?.recipientId) {
      throw new BadRequestException('recipientId is required');
    }

    const res = await this.chatService.sendMessageWithToken(
      token,
      body.recipientId,
      body.text,
      body.mediaPath ?? null,
    );

    return { success: true, id: res.id };
  }

  @Get('messages')
  @ApiOperation({ summary: 'Получить сообщения диалога с пользователем' })
  @ApiResponse({ status: 200, description: 'Список сообщений диалога' })
  async listDialog(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    const token = this.getAccessToken(req);
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    const safeLimit = limit
      ? Math.max(1, Math.min(100, parseInt(limit, 10)))
      : 50;

    const messages = await this.chatService.listDialogMessages(
      token,
      userId,
      safeLimit,
    );
    return { items: messages };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Список последних диалогов (агрегировано по собеседнику)',
  })
  @ApiResponse({ status: 200, description: 'Список последних диалогов' })
  async listConversations(@Request() req: any, @Query('limit') limit?: string) {
    const token = this.getAccessToken(req);
    const safeLimit = limit
      ? Math.max(1, Math.min(100, parseInt(limit, 10)))
      : 50;

    const items = await this.chatService.listConversationsWithToken(
      token,
      safeLimit,
    );
    return { items };
  }

  // Helper to extract bearer token (needed for Supabase RLS auth.uid())
  private getAccessToken(req: any): string {
    const auth = req?.headers?.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Missing bearer token');
    }
    return token;
  }
}
