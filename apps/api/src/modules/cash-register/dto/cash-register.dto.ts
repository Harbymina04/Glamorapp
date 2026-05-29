import { IsString, IsOptional, IsNumber, IsUUID, Min, IsEnum } from 'class-validator';

export enum CashMovementTypeEnum {
  in = 'in',
  out = 'out',
}

export class OpenSessionDto {
  @IsNumber()
  @Min(0)
  openingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  registerId?: string;
}

export class CreateRegisterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRegisterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isActive?: boolean;
}

export class CloseSessionDto {
  @IsNumber()
  @Min(0)
  closingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CashMovementDto {
  @IsEnum(CashMovementTypeEnum)
  type: 'in' | 'out';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}
