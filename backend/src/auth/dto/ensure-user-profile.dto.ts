import { IsString, IsNotEmpty } from 'class-validator';

export class EnsureUserProfileDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;
}
