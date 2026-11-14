import { IsInt, IsOptional, Min } from 'class-validator';

// The user always comes from the login token (req.user.user_id), never from the request.

export class AddCartItemDto {
  @IsInt()
  @Min(1)
  product_id!: number;

  // how many to add (or add on top of what is already in the cart); defaults to 1
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class UpdateCartItemDto {
  // the new quantity (not an increment); use DELETE to remove the item
  @IsInt()
  @Min(1)
  quantity!: number;
}