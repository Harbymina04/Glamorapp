import { IsString, IsEmail, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';

export class TenantCreateUserDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsUUID()
  storeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class TenantResetPasswordDto {
  @IsStrongPassword()
  password: string;
}
