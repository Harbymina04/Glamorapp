import {
  IsArray, IsOptional, IsString, IsUUID, IsNumber, IsBoolean, IsInt,
  IsIn, Min, Max, MaxLength, ArrayMinSize, ValidateNested, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'mixed', 'other'] as const;

export class SaleItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ivaRate?: number;

  @IsOptional()
  @IsBoolean()
  isIvaExcluded?: boolean;

  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class PaymentDto {
  @IsIn(PAYMENT_METHODS as unknown as string[])
  paymentMethod: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}

export class CompleteSaleDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments?: PaymentDto[];
}

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class RefundItemDto {
  @IsUUID()
  saleItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class RefundSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items: RefundItemDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @IsIn(['cash', 'card', 'transfer'])
  refundMethod: string;
}
