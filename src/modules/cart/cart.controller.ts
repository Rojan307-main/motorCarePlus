import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../auth/jwt.strategy';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /cart
  @Get()
  getCart(@Req() req: { user: AuthUser }) {
    return this.cartService.getCart(req.user.user_id);
  }

  // add a product, or increase it if it is already in the cart
  @Post('items')
  addItem(@Req() req: { user: AuthUser }, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.user_id, dto);
  }

  // set the quantity of one cart item
  @Put('items/:item_id')
  updateItem(
    @Req() req: { user: AuthUser },
    @Param('item_id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,) 
  {
    return this.cartService.updateItem(req.user.user_id, itemId, dto);
  }

  // DELETE /cart/items/:item_id
  @Delete('items/:item_id')
  removeItem(
    @Req() req: { user: AuthUser },
    @Param('item_id', ParseIntPipe) itemId: number,) 
{
    return this.cartService.removeItem(itemId, req.user.user_id);
  }

  // DELETE /cart
  @Delete()
  clear(@Req() req: { user: AuthUser }) {
    return this.cartService.clear(req.user.user_id);
  }
}