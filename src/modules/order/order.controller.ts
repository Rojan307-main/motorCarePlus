import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../auth/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guard';
import { RoleEnum } from '../../common/enums/role.enum';
import { OrderService } from './order.service';
import { CheckoutDto, ListOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  checkout(@Req() req: { user: AuthUser }, @Body() dto: CheckoutDto) {
    return this.orderService.checkout(req.user.user_id, dto);
  }

  // normal user: only their own orders. admin: all orders, optional ?user_id= filter
  // example: GET /orders?order_status=pending&limit=20&offset=0
  @Get()
  findAll(@Query() query: ListOrdersQueryDto, @Req() req: { user: AuthUser }) {
    return this.orderService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.orderService.findOne(id, req.user);
  }

  // admin only
  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto);
  }
}