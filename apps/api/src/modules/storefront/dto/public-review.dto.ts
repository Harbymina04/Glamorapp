import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * Reseña enviada desde el storefront público.
 *
 * `isVerified`, `reply`, `repliedAt` y demás campos los controla el
 * servidor; el cliente solo aporta su nombre, calificación y comentario.
 */
export class CreatePublicReviewDto {
  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsString()
  @MaxLength(255)
  reviewerName: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  reviewerEmail?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
