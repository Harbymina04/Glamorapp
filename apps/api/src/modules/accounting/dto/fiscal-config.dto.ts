import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IdType { cc = 'cc', nit = 'nit', ce = 'ce', pasaporte = 'pasaporte', ti = 'ti', pep = 'pep' }
export enum PersonType { natural = 'natural', juridica = 'juridica' }
export enum TaxRegime {
  responsable_iva = 'responsable_iva',
  no_responsable = 'no_responsable',
  gran_contribuyente = 'gran_contribuyente',
  regimen_simple = 'regimen_simple',
}

export class CreateFiscalConfigDto {
  @ApiProperty() @IsString() businessName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tradeName?: string;
  @ApiProperty() @IsEnum(IdType) idType: IdType;
  @ApiProperty() @IsString() idNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dv?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PersonType) personType?: PersonType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(TaxRegime) taxRegime?: TaxRegime;
  @ApiProperty() @IsString() fiscalAddress: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiProperty() @IsString() fiscalEmail: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fiscalPhone?: string;
  @ApiPropertyOptional() @IsOptional() taxResponsibilities?: any[];
  @ApiPropertyOptional() @IsOptional() @IsString() economicActivityCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() economicActivityDesc?: string;
  @ApiProperty() @IsString() feProvider: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feProviderApiKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feProviderApiSecret?: string;
  @ApiProperty() @IsString() feEnvironment: string;
  @ApiPropertyOptional() @IsOptional() feProviderConfig?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionNumber?: string;
  @ApiPropertyOptional() @IsOptional() resolutionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() resolutionFrom?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() resolutionTo?: number;
  @ApiPropertyOptional() @IsOptional() resolutionValidFrom?: string;
  @ApiPropertyOptional() @IsOptional() resolutionValidTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnPrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dnPrefix?: string;
}

export class UpdateFiscalConfigDto extends CreateFiscalConfigDto {}
