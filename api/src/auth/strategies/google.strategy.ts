import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') ?? 'placeholder',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') ?? 'placeholder',
      callbackURL: `${config.get('API_URL', 'http://localhost:4000')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const { emails, name, photos } = profile;
    done(null, {
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      image: photos?.[0]?.value ?? null,
      provider: 'google',
      providerId: profile.id,
    });
  }
}
