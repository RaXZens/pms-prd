import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Provider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ───── Admin Auth ─────

  async validateAdmin(email: string, pass: string): Promise<any> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (admin && (await bcrypt.compare(pass, admin.passwordHash))) {
      const { passwordHash, ...result } = admin;
      return result;
    }
    return null;
  }

  async loginAdmin(admin: any) {
    const payload = { email: admin.email, sub: admin.id, role: 'ADMIN' };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' },
    };
  }

  // ───── Guest Auth ─────

  async registerGuest(data: { email: string; password: string; name: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        provider: Provider.EMAIL,
      },
    });

    const payload = { email: user.email, sub: user.id, role: 'GUEST' };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: 'GUEST' },
    };
  }

  async validateGuest(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    if (await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async loginGuest(user: any) {
    const payload = { email: user.email, sub: user.id, role: 'GUEST' };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: 'GUEST' },
    };
  }

  // ───── Google OAuth ─────

  async findOrCreateGoogleUser(data: { email: string; name: string }) {
    let user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          provider: Provider.GOOGLE,
        },
      });
    }

    const payload = { email: user.email, sub: user.id, role: 'GUEST' };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: 'GUEST' },
    };
  }
}
