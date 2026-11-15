import { Controller, Get, Post, Body, Param,  Put, Delete, Query, ParseUUIDPipe, ForbiddenException, Patch, Req, UseGuards,  ValidationPipe, } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FindManyOptions } from 'typeorm';
import { UserService } from './user.service';
import { CreateUserDto, UpdateRoleDto, UpdateUserDto } from './dto/user.dto';
import { QueryParserPipe } from '../../common/pipes/QueryParserPipe';
import { UserEntity } from './entities/user.entity';
import { RoleEnum } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { RolesGuard } from '@/src/common/guard';

const bodyPipe = new ValidationPipe({ whitelist: true });

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body(bodyPipe) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  findAll(
    @Query(new QueryParserPipe('MANY', ['full_name', 'email']))
    query: FindManyOptions<UserEntity>,
  ) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthUser },
  ) {
    this.assertSelfOrAdmin(req.user, id);
    return this.userService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(bodyPipe) updateUserDto: UpdateUserDto,
    @Req() req: { user: AuthUser },
  ) {
    this.assertSelfOrAdmin(req.user, id);
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(bodyPipe) dto: UpdateRoleDto,
  ) {
    return this.userService.updateRole(id, dto.role);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthUser },
  ) {
    this.assertSelfOrAdmin(req.user, id);
    return this.userService.remove(id);
  }

  private assertSelfOrAdmin(user: AuthUser, targetId: string): void {
    if (user.role !== RoleEnum.ADMIN && user.user_id !== targetId) {
      throw new ForbiddenException('You can only access your own account');
    }
  }
}