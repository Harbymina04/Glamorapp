import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  tenantName: string;

  /** Only lowercase letters, numbers and hyphens. E.g. "mi-salon-beauty" */
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'tenantSlug solo puede contener letras minúsculas, números y guiones (ej: mi-salon)',
  })
  tenantSlug: string;

  /** If omitted, defaults to tenantName on the backend */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  storeName?: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
