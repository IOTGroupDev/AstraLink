import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsObject,
  IsBoolean,
  ValidateNested,
  Matches,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '@/common/decorators/sanitize.decorator';

/**
 * Preferences DTO with validation
 */
class PreferencesDto {
  @ApiPropertyOptional({
    enum: ['male', 'female', 'any'],
    description: 'Looking for gender preference',
  })
  @IsEnum(['male', 'female', 'any'], {
    message: 'lookingFor must be male, female, or any',
  })
  @IsOptional()
  lookingFor?: 'male' | 'female' | 'any';

  @ApiPropertyOptional({
    minimum: 18,
    maximum: 100,
    description: 'Minimum age preference',
  })
  @IsNumber()
  @Min(18, { message: 'ageMin must be at least 18' })
  @Max(100, { message: 'ageMin must not exceed 100' })
  @IsOptional()
  ageMin?: number;

  @ApiPropertyOptional({
    minimum: 18,
    maximum: 100,
    description: 'Maximum age preference',
  })
  @IsNumber()
  @Min(18, { message: 'ageMax must be at least 18' })
  @Max(100, { message: 'ageMax must not exceed 100' })
  @IsOptional()
  ageMax?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Location preference',
  })
  @Sanitize('strict') // No HTML allowed in location
  @IsString()
  @MaxLength(200)
  @IsOptional()
  location?: string;
}

/**
 * DTO for updating extended user profile
 * Validates and sanitizes user input
 */
export class UpdateExtendedProfileDto {
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'User bio/description',
    example: 'Interested in astrology and personal growth',
  })
  @Sanitize('basic') // Allow basic formatting but prevent XSS
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  @Transform(({ value }) => {
    if (!value) return null;
    // Normalize whitespace after sanitization
    return value.trim().replace(/\s+/g, ' ');
  })
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({
    enum: ['male', 'female', 'other'],
    description: 'User gender',
  })
  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be male, female, or other',
  })
  @IsOptional()
  gender?: 'male' | 'female' | 'other';

  @ApiPropertyOptional({
    type: PreferencesDto,
    description: 'User preferences for matching',
  })
  @IsObject({ message: 'Preferences must be an object' })
  @ValidateNested()
  @Type(() => PreferencesDto)
  @IsOptional()
  preferences?: PreferencesDto;

  @ApiPropertyOptional({
    description: 'Whether user has completed onboarding',
  })
  @IsBoolean({ message: 'is_onboarded must be a boolean' })
  @IsOptional()
  is_onboarded?: boolean;
}
