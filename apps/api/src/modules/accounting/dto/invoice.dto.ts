import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InvoiceType { invoice = 'invoice', credit_note = 'credit_note', debit_note = 'debit_note', support_document = 'support_document', pos_invoice = 'pos_invoice' }

export class InvoiceItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceId?: string;
  @ApiProperty() @IsString() itemType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsString() unitMeasure: string;
  @ApiProperty() @IsNumber() unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountRate?: number;
  @ApiProperty() @IsNumber() ivaRate: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isIvaExcluded?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isIvaExempt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retefuenteRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() standardCode?: string;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseId?: string;
  @ApiProperty() @IsEnum(InvoiceType) invoiceType: InvoiceType;
  @ApiPropertyOptional() @IsOptional() @IsString() referencedInvoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() correctionReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiProperty() @IsString() receiverName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverIdType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverIdNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverCityCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverTaxRegime?: string;
  @ApiPropertyOptional() @IsOptional() receiverTaxResp?: any[];
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethodCode?: string;
  @ApiProperty() @IsString() paymentMeansCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
  @ApiProperty() @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items: InvoiceItemDto[];
}
