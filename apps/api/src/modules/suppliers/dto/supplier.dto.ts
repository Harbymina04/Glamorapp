import {
  IsString, IsOptional, IsEmail, IsBoolean, IsNumber, IsUUID, IsIn,
  IsDateString, Min, MaxLength, IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'mixed', 'other'];
const STATUSES = ['active', 'inactive'];

/** '' → undefined (los formularios mandan cadenas vacías para opcionales). */
const EmptyToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

export class CreateSupplierDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  businessName: string;

  @IsOptional() @IsString() @MaxLength(200)
  contactName?: string;

  @IsOptional() @IsString() @MaxLength(100)
  contactTitle?: string;

  @EmptyToUndefined() @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(255)
  website?: string;

  @IsOptional() @IsString() @MaxLength(50)
  taxId?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @IsOptional() @IsString() @MaxLength(100)
  paymentTerms?: string;

  @IsOptional() @IsIn(PAYMENT_METHODS)
  preferredPaymentMethod?: string;

  @IsOptional() @IsNumber() @Min(0)
  creditLimit?: number;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsIn(STATUSES)
  status?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  declare businessName: string;
}

export class SupplierContactDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @IsOptional() @IsString() @MaxLength(100)
  position?: string;

  @EmptyToUndefined() @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @IsOptional() @IsBoolean()
  isPrimary?: boolean;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class SupplierDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  docType: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @IsOptional() @IsString() @MaxLength(1000)
  fileUrl?: string;

  @EmptyToUndefined() @IsOptional() @IsDateString()
  expiryDate?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class AddSupplierProductDto {
  @IsUUID()
  productId: string;

  @IsOptional() @IsString() @MaxLength(50)
  supplierSku?: string;

  @IsOptional() @IsNumber() @Min(0)
  supplierPrice?: number;

  @IsOptional() @IsBoolean()
  isPreferred?: boolean;
}

export class UpdateSupplierProductDto {
  @IsOptional() @IsString() @MaxLength(50)
  supplierSku?: string;

  @IsOptional() @IsNumber() @Min(0)
  supplierPrice?: number;

  @IsOptional() @IsBoolean()
  isPreferred?: boolean;
}

export class UpdateSupplierPriceDto {
  @IsNumber() @Min(0)
  newPrice: number;

  @IsOptional() @IsString() @MaxLength(255)
  reason?: string;
}
