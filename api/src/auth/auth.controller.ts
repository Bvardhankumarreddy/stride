import { Controller, Post, Patch, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('send-otp')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto);
  }

  @Post('verify-otp')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Post('register-member')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  registerMember(@Body() dto: RegisterDto) {
    return this.auth.registerMember(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: { refreshToken: string }) {
    return this.auth.logout(body.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: { token: string }) {
    return this.auth.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  resendVerification(@Req() req: any) {
    return this.auth.resendVerification(req.user.sub);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() req: any) {
    return this.auth.getMe(req.user.sub);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const result = await this.auth.oauthLogin(req.user);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    res.redirect(`${appUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: any) {
    const result = await this.auth.oauthLogin(req.user);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    res.redirect(`${appUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
  }
}
