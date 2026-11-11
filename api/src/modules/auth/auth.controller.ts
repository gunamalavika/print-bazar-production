import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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

  @Get('staff')
  @ApiOperation({ summary: 'List all staff users in enterprise' })
  async listStaff() {
    return this.authService.listStaff();
  }

  @Post('staff')
  @ApiOperation({ summary: 'Create or upsert staff user with enterprise role and password' })
  async createStaff(@Body() body: any) {
    return this.authService.createOrUpdateStaff(body);
  }

  @Put('staff/:id')
  @ApiOperation({ summary: 'Update staff user' })
  async updateStaff(@Param('id') id: string, @Body() body: any) {
    return this.authService.updateStaff(id, body);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete or deactivate staff user' })
  async deleteStaff(@Param('id') id: string) {
    return this.authService.deleteStaff(id);
  }

  @Post('staff/:id/reset-password')
  @ApiOperation({ summary: 'Reset staff password' })
  async resetPassword(@Param('id') id: string, @Body() body: { password?: string }) {
    return this.authService.resetStaffPassword(id, body?.password);
  }
}
