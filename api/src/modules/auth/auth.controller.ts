import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsEmail } from 'class-validator';

class RegisterDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  id_doc: string;

  @IsEnum(['passenger', 'driver'])
  role: 'passenger' | 'driver';

  @IsString()
  @IsOptional()
  selfie_url?: string;
}

class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;
}

class LoginDto {
  @IsString()
  phone: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    // TODO: Crear usuario en BD, generar OTP
    const otp = this.authService.generateOtp(dto.phone);
    return { message: 'OTP sent', otp_sent: true };
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    const valid = this.authService.verifyOtp(dto.phone, dto.code);
    if (!valid) {
      return { error: 'Invalid or expired code' };
    }
    // TODO: Buscar usuario en BD y generar token real
    const token = this.authService.generateToken({
      sub: 'temp-user-id',
      role: 'passenger',
    });
    return { token, user: { id: 'temp-user-id', phone: dto.phone } };
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    const otp = this.authService.generateOtp(dto.phone);
    return { message: 'OTP sent' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return req.user;
  }
}
