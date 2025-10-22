import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * Извлекает userId из объекта request
 * Поддерживает различные форматы токенов (id, userId, sub)
 *
 * @param req - AuthenticatedRequest объект
 * @returns userId string
 * @throws UnauthorizedException если userId не найден
 */
export function getUserId(req: AuthenticatedRequest): string {
  const userId = req.user?.id || req.user?.userId || req.user?.sub;

  if (!userId) {
    throw new UnauthorizedException('User ID not found in request');
  }

  return userId;
}

/**
 * Безопасное извлечение userId без выброса ошибки
 * Возвращает undefined если userId не найден
 *
 * @param req - AuthenticatedRequest объект
 * @returns userId string или undefined
 */
export function getUserIdSafe(req: AuthenticatedRequest): string | undefined {
  return req.user?.id || req.user?.userId || req.user?.sub;
}

/**
 * Извлекает email пользователя из request
 *
 * @param req - AuthenticatedRequest объект
 * @returns email string
 * @throws UnauthorizedException если email не найден
 */
export function getUserEmail(req: AuthenticatedRequest): string {
  const email = req.user?.email;

  if (!email) {
    throw new UnauthorizedException('User email not found in request');
  }

  return email;
}

/**
 * Проверяет, имеет ли пользователь определенную роль
 *
 * @param req - AuthenticatedRequest объект
 * @param role - проверяемая роль
 * @returns boolean
 */
export function hasRole(req: AuthenticatedRequest, role: string): boolean {
  return req.user?.role === role;
}

/**
 * Проверяет, является ли пользователь администратором
 *
 * @param req - AuthenticatedRequest объект
 * @returns boolean
 */
export function isAdmin(req: AuthenticatedRequest): boolean {
  return hasRole(req, 'admin');
}
