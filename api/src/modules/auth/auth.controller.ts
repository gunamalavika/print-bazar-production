import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, RegisterUserDto, LoginDto } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { JwtPayload } from '../../common/types/roles';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer or staff member' })
  async register(@Body() body: RegisterUserDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email/mobile and receive JWT authentication token' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and terminate active session' })
  async logout() {
    return { success: true, message: 'Session terminated successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of the authenticated user' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }
}
