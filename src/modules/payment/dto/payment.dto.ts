import { IsInt, Min } from 'class-validator';

export class PayDto {
  @IsInt()
  @Min(1)
  order_id!: number;
}