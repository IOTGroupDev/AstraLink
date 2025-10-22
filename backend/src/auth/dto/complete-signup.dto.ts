import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CompleteSignupDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Дата должна быть в формате YYYY-MM-DD',
  })
  birthDate!: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:mm',
  })
  birthTime?: string;

  @IsString()
  @IsOptional()
  birthPlace?: string;
}
