import {
  IsString, IsOptional, IsNumber, IsBoolean,
  IsArray, IsDateString, IsEnum, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DiscountScope {
  ALL      = 'all',
  CATEGORY = 'category',
  PRODUCTS = 'products',
  SERVICES = 'services',
}

export class CreateDiscountDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  @Type(() => Number)
  discountPercent: number;

  @IsEnum(DiscountScope)
  scope: DiscountScope;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountDto extends CreateDiscountDto {}
