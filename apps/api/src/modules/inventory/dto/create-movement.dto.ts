import { IsUUID, IsInt, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: ['entry', 'exit', 'adjustment'] })
  @IsIn(['entry', 'exit', 'adjustment'])
  movementType: 'entry' | 'exit' | 'adjustment';

  @ApiProperty({
    description:
      'Cantidad. entry suma, exit resta, adjustment es un delta con signo (positivo suma, negativo resta). Debe ser distinto de 0.',
  })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
