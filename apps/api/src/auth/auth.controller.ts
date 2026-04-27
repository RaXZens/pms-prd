import { Controller, Post, Body, UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ───── Admin ─────

  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    const admin = await this.authService.validateAdmin(body.email, body.password);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.loginAdmin(admin);
  }

  // ───── Guest ─────

  @Post('register')
  async register(@Body() body: { email: string; password: string; name: string }) {
    return this.authService.registerGuest(body);
  }

  @Post('guest/login')
  async guestLogin(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateGuest(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.loginGuest(user);
  }

  // ───── Google OAuth (called by NextAuth) ─────

  @Post('google')
  async googleAuth(@Body() body: { email: string; name: string }) {
    return this.authService.findOrCreateGoogleUser(body);
  }
}
