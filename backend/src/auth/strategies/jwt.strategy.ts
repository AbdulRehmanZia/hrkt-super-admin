import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from '../../schemas';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_change_in_production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findById(payload.sub).exec();
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }
    return {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      facilityId: user.facilityId ? user.facilityId.toString() : null,
    };
  }
}
