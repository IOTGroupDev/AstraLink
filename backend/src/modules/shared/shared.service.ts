import { Injectable, Logger } from '@nestjs/common';

/**
 * Общий сервис для утилитарных функций
 */
@Injectable()
export class SharedService {
  private readonly logger = new Logger(SharedService.name);

  /**
   * Логирует информационное сообщение
   */
  logInfo(message: string, meta?: any): void {
    if (meta) {
      this.logger.log(message, meta);
    } else {
      this.logger.log(message);
    }
  }

  /**
   * Логирует сообщение об ошибке
   */
  logError(message: string, error?: any): void {
    if (error) {
      this.logger.error(message, error);
    } else {
      this.logger.error(message);
    }
  }

  /**
   * Логирует предупреждение
   */
  logWarn(message: string, meta?: any): void {
    if (meta) {
      this.logger.warn(message, meta);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Проверяет, является ли значение пустым
   */
  isEmpty(value: any): boolean {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Глубокое клонирование объекта
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (Array.isArray(obj))
      return obj.map((item) => this.deepClone(item)) as unknown as T;

    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Форматирует число с ведущими нулями
   */
  padNumber(num: number, size: number): string {
    return String(num).padStart(size, '0');
  }

  /**
   * Преобразует строку в kebab-case
   */
  toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Преобразует строку в camelCase
   */
  toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase(),
      )
      .replace(/\s+/g, '');
  }

  /**
   * Генерирует случайную строку указанной длины
   */
  generateRandomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Вычисляет процент от числа
   */
  percentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  /**
   * Ограничивает число в диапазоне
   */
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Проверяет, является ли email валидным
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Маскирует чувствительные данные
   */
  maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) return data;
    const masked = '*'.repeat(data.length - visibleChars);
    return data.slice(-visibleChars) + masked;
  }
}
