import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Публичные маршруты, которые не требуют авторизации
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/signup',
      '/api',
      '/api/docs',
    ];

    // Проверяем, является ли маршрут публичным
    const isPublicRoute = publicRoutes.some(route => 
      req.path === route || req.path.startsWith(route + '/')
    );

    if (isPublicRoute) {
      return next();
    }

    // Извлекаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return this.handleUnauthorized(res, 'Токен авторизации отсутствует');
    }

    const token = authHeader.substring(7); // Убираем 'Bearer '

    try {
      // Проверяем валидность токена с секретом
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      
      // Добавляем данные пользователя в запрос
      (req as any).user = {
        userId: payload.sub,
        email: payload.email,
      };

      next();
    } catch (error) {
      console.log('JWT verification error:', error.message);
      return this.handleUnauthorized(res, 'Недействительный токен авторизации');
    }
  }

  private handleUnauthorized(res: Response, message: string) {
    // Определяем, откуда пришел запрос
    const userAgent = res.req.headers['user-agent'] || '';
    const isWebBrowser = userAgent.includes('Mozilla');
    const isMobile = /(react-native|expo|mobile)/i.test(userAgent);

    if (isWebBrowser) {
      // Для веб-браузера перенаправляем на страницу регистрации
      return res.redirect('/signup?message=' + encodeURIComponent(message));
    } else {
      // Для API запросов (включая мобильные) возвращаем JSON с информацией о перенаправлении на регистрацию
      return res.status(401).json({
        statusCode: 401,
        message,
        error: 'Unauthorized',
        redirectTo: '/signup',
        requiresAuth: true,
        availableActions: {
          signup: '/api/auth/signup',
          login: '/api/auth/login'
        }
      });
    }
  }
}
