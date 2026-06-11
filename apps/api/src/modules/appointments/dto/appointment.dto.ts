import {
  IsUUID, IsOptional, IsString, IsNumber, IsDateString, Matches, Min, MaxLength, IsNotEmpty,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm 24h

export class CreateAppointmentDto {
  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  nailDesignId?: string;

  @IsDateString()
  date: string;

  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // Si se omite, se toma del precio del servicio.
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  nailDesignId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

/** Reserva desde el storefront (cliente). El precio lo fija el servidor. */
export class CustomerBookDto {
  @IsUUID()
  storeId: string;

  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  nailDesignId?: string;

  @IsDateString()
  date: string;

  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
