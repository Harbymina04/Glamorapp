import {
  IsString, IsOptional, IsEmail, IsBoolean, IsArray, IsIn, IsDateString, MaxLength, IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

const SEGMENTS = ['new', 'frequent', 'inactive', 'vip'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum'];

/** Convierte cadenas vacías en undefined (formularios envían '' para campos opcionales). */
const EmptyToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsIn(SEGMENTS)
  segment?: string;

  @IsOptional()
  @IsIn(TIERS)
  loyaltyTier?: string;

  @IsOptional()
  @IsArray()
  tags?: any[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsIn(SEGMENTS)
  segment?: string;

  @IsOptional()
  @IsIn(TIERS)
  loyaltyTier?: string;

  @IsOptional()
  @IsArray()
  tags?: any[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
