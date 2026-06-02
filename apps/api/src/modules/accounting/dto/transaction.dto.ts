import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType { income = 'income', expense = 'expense', transfer = 'transfer', tax_payment = 'tax_payment', adjustment = 'adjustment' }

export class CreateTransactionDto {
  @ApiProperty() @IsEnum(TransactionType) transactionType: TransactionType;
  @ApiProperty() @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subcategory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expenseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceId?: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiProperty() @IsNumber() grossAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retentionAmount?: number;
  @ApiProperty() @IsNumber() netAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ivaAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() retefuenteAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() reteIvaAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() reteIcaAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() icaAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiProperty() @IsDateString() transactionDate: string;
}
