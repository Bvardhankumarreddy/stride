import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GITHUB_CLIENT_ID') ?? 'placeholder',
      clientSecret: config.get('GITHUB_CLIENT_SECRET') ?? 'placeholder',
      callbackURL: `${config.get('API_URL', 'http://localhost:4000')}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const email = profile.emails?.[0]?.value;
    done(null, {
      email,
      name: profile.displayName || profile.username,
      image: profile.photos?.[0]?.value ?? null,
      provider: 'github',
      providerId: profile.id,
    });
  }
}
