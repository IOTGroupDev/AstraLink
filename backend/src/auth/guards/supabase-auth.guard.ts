import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен авторизации не предоставлен');
    }

    const token = authHeader.substring(7); // Убираем "Bearer "

    try {
      const { data, error } = await this.supabaseService.getUser(token);
      
      if (error || !data.user) {
        throw new UnauthorizedException('Недействительный токен');
      }

      // Добавляем пользователя в запрос для использования в контроллерах
      request.user = data.user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Ошибка проверки токена');
    }
  }
}

