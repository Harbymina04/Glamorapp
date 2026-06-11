import { IsUUID, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({ description: 'ID del producto en la sucursal origen' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID de la sucursal destino' })
  @IsUUID()
  targetStoreId: string;

  @ApiProperty({ description: 'Cantidad a transferir', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
