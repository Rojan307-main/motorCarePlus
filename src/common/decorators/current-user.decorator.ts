import { getCurrentUser } from "@/common/helpers/auth.helper";
import { IRequest } from "@/common/interfaces/request.interface";
import { createParamDecorator, ExecutionContext, UnauthorizedException, } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req: IRequest = context.switchToHttp().getRequest();
    const user = getCurrentUser(req);

    if (typeof user === "string") {
      throw new UnauthorizedException(user);
    }
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    return user;
  },
);

export const OptionalCurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req: IRequest = context.switchToHttp().getRequest();
    const user = getCurrentUser(req);
    if (typeof user === "string") return null;
    return user;
  },
);