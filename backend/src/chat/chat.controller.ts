import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  ChatMediaUploadDto,
  SendMessageDto,
  DialogQueryDto,
  ChatLimitDto,
} from './dto/chat.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('media/upload-url')
  @ApiOperation({ summary: 'Получить signed upload URL для chat media' })
  @ApiResponse({ status: 201, description: 'Signed upload URL создан' })
  async createChatMediaUploadUrl(
    @Request() req: any,
    @Body() body?: ChatMediaUploadDto,
  ) {
    const userId = req?.user?.userId || req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not resolved from auth context');
    }

    return await this.chatService.createMediaUploadUrl(
      String(userId),
      body?.ext,
    );
  }

  @Post('messages/send')
  @ApiOperation({ summary: 'Отправить сообщение пользователю' })
  @ApiResponse({ status: 201, description: 'Сообщение отправлено' })
  async sendMessage(@Request() req: any, @Body() body: SendMessageDto) {
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
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Получить сообщения диалога с пользователем' })
  @ApiResponse({ status: 200, description: 'Список сообщений диалога' })
  async listDialog(@Request() req: any, @Query() query: DialogQueryDto) {
    const token = this.getAccessToken(req);
    const { userId, limit: safeLimit, before } = query;

    const messages = await this.chatService.listDialogMessages(
      token,
      userId,
      safeLimit,
      before,
    );
    const first = messages[0];
    return {
      items: messages,
      nextCursor:
        messages.length === safeLimit && first
          ? `${first.createdAt}~${first.id}`
          : null,
    };
  }

  @Get('conversations')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Список последних диалогов (агрегировано по собеседнику)',
  })
  @ApiResponse({ status: 200, description: 'Список последних диалогов' })
  async listConversations(@Request() req: any, @Query() query: ChatLimitDto) {
    const token = this.getAccessToken(req);
    const safeLimit = query.limit;

    const items = await this.chatService.listConversationsWithToken(
      token,
      safeLimit,
    );
    return { items };
  }

  @Delete('messages/:id')
  @ApiOperation({
    summary: 'Удалить сообщение',
    description:
      'mode=for_me — скрыть сообщение у текущего пользователя (не удаляя из БД); mode=for_all — удалить для всех (только отправитель)',
  })
  @ApiResponse({ status: 200, description: 'Удаление выполнено' })
  async deleteMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Query('mode') mode?: 'for_me' | 'for_all',
  ) {
    const token = this.getAccessToken(req);
    if (!id) throw new BadRequestException('message id is required');

    const safeMode: 'for_me' | 'for_all' =
      mode === 'for_all' ? 'for_all' : 'for_me';

    const result = await this.chatService.deleteMessageWithToken(
      token,
      id,
      safeMode,
    );
    return result;
  }

  @Delete('conversations/:otherUserId')
  @ApiOperation({
    summary: 'Удалить переписку у себя',
    description:
      'Скрывает диалог (переписку) у текущего пользователя. Сообщения в БД не удаляются.',
  })
  @ApiResponse({ status: 200, description: 'Переписка скрыта' })
  async deleteConversation(
    @Request() req: any,
    @Param('otherUserId') otherUserId: string,
  ) {
    const token = this.getAccessToken(req);
    if (!otherUserId) {
      throw new BadRequestException('otherUserId is required');
    }
    return await this.chatService.deleteConversationForMe(token, otherUserId);
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
