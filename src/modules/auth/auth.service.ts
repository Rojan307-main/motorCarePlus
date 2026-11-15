import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserService } from "../user/user.service";
import { UserEntity } from "../user/entities/user.entity";
import { AuthDto } from "./dto/auth.dto";
import { appConfig } from "@/src/config/app.config";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;   // 7 days
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(dto: AuthDto) {
    const user = await this.userService.findOneByEmailWithPassword(dto.email);

    if (!user || !(await this.validatePassword(dto.password, user.password_hash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.signTokens(user);
  }

  async signTokens(user: UserEntity): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const accessPayload = {
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };
    const refreshPayload = { user_id: user.id };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        secret: appConfig.env.JWT_BEARER_SECRET,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        secret: appConfig.env.JWT_REFRESH_SECRET,
      }),
    ]);

    return {
      access_token,
      refresh_token,
      expires_in: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
    };
  }

  private async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}