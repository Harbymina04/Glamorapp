import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ReceiveItemDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0)
  quantityReceived: number;
}

export class ReceivePurchaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}
