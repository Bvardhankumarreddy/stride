import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Request, Response, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private integrations: IntegrationsService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: any) {
    return this.integrations.findAll(req.user.organizationId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  upsert(@Request() req: any, @Body() dto: CreateIntegrationDto) {
    return this.integrations.upsert(req.user.organizationId, dto);
  }

  @Delete(':type')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('type') type: string) {
    return this.integrations.remove(req.user.organizationId, type);
  }

  /** Initiate GitHub OAuth — token passed as query param since this is a browser redirect */
  @Get('oauth/github')
  startGitHubOAuth(@Query('token') token: string, @Response() res: any) {
    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    const state = Buffer.from(JSON.stringify({ orgId: payload.organizationId })).toString('base64url');
    const apiUrl = this.config.get('API_URL', 'http://localhost:4000');
    const params = new URLSearchParams({
      client_id: this.config.get('GITHUB_CLIENT_ID', ''),
      redirect_uri: `${apiUrl}/integrations/oauth/github/callback`,
      scope: 'repo read:user',
      state,
    });
    return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  }

  /** GitHub redirects here with code + state */
  @Get('oauth/github/callback')
  async githubOAuthCallback(@Query('code') code: string, @Query('state') state: string, @Response() res: any) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3001');
    try {
      const { orgId } = JSON.parse(Buffer.from(state, 'base64url').toString());

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.config.get('GITHUB_CLIENT_ID'),
          client_secret: this.config.get('GITHUB_CLIENT_SECRET'),
          code,
        }),
      });
      const data = await tokenRes.json() as { access_token?: string };
      if (!data.access_token) throw new Error('No access token returned');

      await this.integrations.upsert(orgId, { type: 'GitHub', token: data.access_token, config: {} });
      return res.redirect(`${appUrl}/settings?integration_success=github`);
    } catch {
      return res.redirect(`${appUrl}/settings?integration_error=github`);
    }
  }
}
