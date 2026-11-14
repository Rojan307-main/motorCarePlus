import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../auth/jwt.strategy';
import { PaymentService } from './payment.service';
import { PayDto } from './dto/payment.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('pay')
  @HttpCode(HttpStatus.OK)
  pay(@Body() dto: PayDto, @Req() req: { user: AuthUser }) {
    return this.paymentService.pay(dto, req.user);
  }

  @Get('order/:order_id')
  findByOrder(
    @Param('order_id', ParseIntPipe) orderId: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.paymentService.findByOrder(orderId, req.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.paymentService.findOne(id, req.user);
  }
}