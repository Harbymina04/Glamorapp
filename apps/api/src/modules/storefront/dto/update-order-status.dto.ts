import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
  status: string;
}
