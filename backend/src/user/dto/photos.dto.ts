import { IsOptional, IsString, IsIn } from 'class-validator';

/**
 * Запрос на получение одноразовой signed upload URL
 * path — опционально, если не передан — будет сгенерирован в формате {userId}/{uuid}.ext
 * ext — расширение файла, по умолчанию jpg
 */
export class GetUploadUrlDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  @IsIn(['jpg', 'jpeg', 'png', 'webp'])
  ext?: string = 'jpg';
}

/**
 * Подтверждение загрузки файла в Storage — сохраняем запись в user_photos
 */
export class ConfirmPhotoDto {
  @IsString()
  path!: string;
}
