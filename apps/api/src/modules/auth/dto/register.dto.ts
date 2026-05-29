import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(255)
  tenantName: string;

  @IsString()
  @MaxLength(100)
  tenantSlug: string;

  @IsString()
  @MaxLength(255)
  storeName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
