import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsUUID,
  MaxLength,
  IsIn,
} from 'class-validator';

/**
 * Datos que el storefront público puede enviar al crear una orden.
 *
 * Solo se aceptan campos del comprador y el carrito. Todos los campos
 * financieros y de estado (subtotal, total, status, platformFee,
 * tenantPayout, paymentStatus, saleId, payoutId, orderNumber) los
 * calcula/controla el servidor — nunca el cliente — para evitar
 * mass assignment y manipulación de precios/estado.
 */
export class CreatePublicOrderDto {
  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsString()
  @MaxLength(255)
  buyerName: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  buyerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  buyerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  buyerNotes?: string;

  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  @IsIn(['store', 'pse', 'card', 'nequi'])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pickup', 'delivery'])
  deliveryMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;
}
