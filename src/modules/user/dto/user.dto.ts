import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, IsEnum } from 'class-validator';
import { RoleEnum } from '../../../common/enums/role.enum';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const PASSWORD_MESSAGE ='Password must be at least 6 characters long and contain at least one letter and one number';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  full_name!: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  full_name?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}

export class UpdateRoleDto {
  @IsEnum(RoleEnum, { message: 'Invalid role' })
  role!: RoleEnum;
}