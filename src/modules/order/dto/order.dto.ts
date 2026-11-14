import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Max, Min, ValidateIf } from 'class-validator';
import { FulfilmentMethodEnum } from '../../../common/enums/fulfilment-method.enum';
import { OrderStatusEnum } from '../../../common/enums/order-status.enum';
import { PaymentMethodEnum } from '../../../common/enums/payment-method.enum';
import { MAX_PAGE_LIMIT } from '../../../common/helpers/pagination.helper';

export class CheckoutDto {
  // the user comes from the login token (req.user.user_id), never from the request

  @IsEnum(FulfilmentMethodEnum)
  fulfilment_method!: FulfilmentMethodEnum;

  // required only for delivery; ignored (stored as null) for pickup
  @ValidateIf((dto: CheckoutDto) => dto.fulfilment_method === FulfilmentMethodEnum.DELIVERY)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'delivery_address is required for delivery' })
  @MaxLength(500)
  delivery_address?: string;

  @IsEnum(PaymentMethodEnum)
  payment_method!: PaymentMethodEnum;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatusEnum)
  status!: OrderStatusEnum;
}

export class ListOrdersQueryDto {
  // used only by an admin as an optional filter; a normal user is always limited to their own orders
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsEnum(OrderStatusEnum)
  order_status?: OrderStatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}