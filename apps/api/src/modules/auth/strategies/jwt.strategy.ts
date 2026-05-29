import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { getEffectiveScopes } from '../../../common/constants/role-scopes';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  storeId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set and at least 32 characters long');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        permissions: {
          select: {
            module: true,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canExport: true,
          },
        },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User inactive or not found');
    }

    // Resolve effective scopes from role defaults + custom permissions
    const scopes = getEffectiveScopes(user.role, user.permissions);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      storeId: user.storeId,
      scopes,
    };
  }
}
