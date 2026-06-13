import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Campos que un usuario puede actualizar de su propio perfil.
 * Se excluyen a propósito email, role, tenantId, storeId (no editables aquí).
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
