import { IsEmail, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  message: string;
}
