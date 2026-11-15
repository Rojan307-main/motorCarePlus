import { appConfig } from "@/src/config";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { RoleEnum } from "../../common/enums/role.enum";

export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  role: RoleEnum;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.env.JWT_BEARER_SECRET,
    });
  }
  
  async validate(payload: AuthUser): Promise<AuthUser> {
    return payload;
  }
}