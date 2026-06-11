import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/** Mensaje único de política de contraseñas (reutilizado en todos los flujos). */
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';

/**
 * Política única de contraseñas para toda la app:
 * mínimo 8 caracteres, con al menos una minúscula, una mayúscula y un número.
 *
 * Úsalo en cualquier DTO donde el usuario establezca una contraseña
 * (registro, creación de usuarios, reset). NO usar en login.
 *
 * @example
 *   class ResetPasswordDto {
 *     @IsStrongPassword()
 *     password: string;
 *   }
 */
export function IsStrongPassword() {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: PASSWORD_POLICY_MESSAGE }),
    MaxLength(100),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: PASSWORD_POLICY_MESSAGE }),
  );
}
