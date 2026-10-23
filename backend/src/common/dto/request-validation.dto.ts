import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
  ValidateNested,
} from 'class-validator';

export class BirthDataDto {
  @ApiProperty({ example: '1990-01-01' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string;
  @ApiProperty({ example: '14:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  birthTime!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  birthPlace?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-14)
  @Max(14)
  timezone?: number;
}
export class SignupDto extends OmitType(BirthDataDto, ['birthTime'] as const) {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  birthTime?: string;
}
export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  birthTime?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  birthPlace?: string;
}
class OAuthUserDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
export class OAuthCallbackDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(16384)
  access_token!: string;
  @ApiProperty({ type: OAuthUserDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OAuthUserDto)
  user!: OAuthUserDto;
}
export class CreateConnectionDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) targetName!: string;
  @ApiProperty({ type: BirthDataDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => BirthDataDto)
  targetData!: BirthDataDto;
}
class ChartBirthDataDto extends PartialType(
  OmitType(BirthDataDto, ['timezone'] as const),
) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() birthTimeKnown?: boolean;
  @ApiPropertyOptional({ oneOf: [{ type: 'number' }, { type: 'string' }] })
  @IsOptional()
  @ValidateBy({
    name: 'timezone',
    validator: {
      validate(value: unknown) {
        if (typeof value === 'number')
          return Number.isFinite(value) && Math.abs(value) <= 14;
        if (typeof value !== 'string' || value.length > 100) return false;
        if (/^(?:UTC|GMT)(?:[+-]\d{1,2}(?::\d{2})?)?$/i.test(value))
          return true;
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      },
    },
  })
  timezone?: string | number;
}
export class CreateChartRequestDto {
  @ApiProperty({ type: ChartBirthDataDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ChartBirthDataDto)
  data!: ChartBirthDataDto;
}
