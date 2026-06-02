import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsObject, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MasterCategoryTypeDto {
  product = 'product',
  service = 'service',
  design  = 'design',
  general = 'general',
}

export class CreateMasterCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: { es: 'Uñas', en: 'Nails' } })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ enum: MasterCategoryTypeDto })
  @IsOptional()
  @IsEnum(MasterCategoryTypeDto)
  type?: MasterCategoryTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMasterCategoryDto extends CreateMasterCategoryDto {}

export class CreateMasterBrandDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: { es: "L'Oréal", en: "L'Oreal" } })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMasterBrandDto extends CreateMasterBrandDto {}

export class CreateCountryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2)
  isoCode: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: { es: 'Colombia', en: 'Colombia' } })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiProperty()
  @IsString()
  @MaxLength(5)
  dialCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  flag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCountryDto extends CreateCountryDto {}

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  countryId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: { es: 'Antioquia', en: 'Antioquia' } })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}

export class CreateCityDto {
  @ApiProperty()
  @IsString()
  departmentId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: { es: 'Medellín', en: 'Medellin' } })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;
}

export class UpdateCityDto extends CreateCityDto {}
