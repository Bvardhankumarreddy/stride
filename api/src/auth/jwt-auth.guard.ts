import { Injectable, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const result = super.handleRequest(err, user, info, context);
    if (result?.mustChangePassword) {
      const req = context.switchToHttp().getRequest();
      const path: string = req.path ?? '';
      // Only allow the change-password endpoint
      if (!path.includes('/auth/change-password')) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'PASSWORD_CHANGE_REQUIRED',
          message: 'You must change your password before continuing',
        });
      }
    }
    return result;
  }
}
