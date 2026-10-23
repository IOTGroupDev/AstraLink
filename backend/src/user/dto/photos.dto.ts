import {
  IsOptional,
  IsString,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';

export const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const MAX_PHOTO_PATH_LENGTH = 1024;
// Ownership is also checked against the authenticated user in the service.
// The final lookahead requires the actual end, including for trailing newlines.
export const PHOTO_PATH_PATTERN =
  /^[a-zA-Z0-9_-]+\/(?:[a-zA-Z0-9][a-zA-Z0-9._-]*\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpg|jpeg|png|webp)(?![\s\S])/;

export function isOwnedPhotoPath(
  userId: unknown,
  path: unknown,
): path is string {
  return (
    typeof userId === 'string' &&
    /^[a-zA-Z0-9_-]+(?![\s\S])/.test(userId) &&
    typeof path === 'string' &&
    path.length <= MAX_PHOTO_PATH_LENGTH &&
    PHOTO_PATH_PATTERN.test(path) &&
    path.startsWith(`${userId}/`)
  );
}

/**
 * Запрос на получение одноразовой signed upload URL
 * path — опционально, если не передан — будет сгенерирован в формате {userId}/{uuid}.ext
 * ext — расширение файла, по умолчанию jpg
 */
export class GetUploadUrlDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_PHOTO_PATH_LENGTH)
  @Matches(PHOTO_PATH_PATTERN)
  path?: string;

  @IsOptional()
  @IsString()
  @IsIn(PHOTO_EXTENSIONS)
  ext?: string = 'jpg';
}

/**
 * Подтверждение загрузки файла в Storage — сохраняем запись в user_photos
 */
export class ConfirmPhotoDto {
  @IsString()
  @MaxLength(MAX_PHOTO_PATH_LENGTH)
  @Matches(PHOTO_PATH_PATTERN)
  path!: string;
}
