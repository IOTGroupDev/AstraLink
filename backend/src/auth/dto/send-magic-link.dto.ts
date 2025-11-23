import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO для отправки магической ссылки (Magic Link)
 * Используется для passwordless входа
 */
export class SendMagicLinkDto {
  @ApiProperty({
    description: 'Email для отправки магической ссылки',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email!: string;
}
