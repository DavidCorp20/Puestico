import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
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
  async register(@Body() dto: RegisterDto) {
    const { user, is_new } = await this.authService.upsertUser(dto);
    const code = this.authService.generateOtp(user.phone);
    return {
      message: 'Código enviado',
      otp_sent: true,
      is_new,
      // Solo en modo demo: ver la nota en auth.service.ts.
      ...(this.authService.demoOtpEnabled ? { demo_code: code } : {}),
    };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    if (!this.authService.verifyOtp(dto.phone, dto.code)) {
      throw new UnauthorizedException('El código es incorrecto o ya expiró');
    }

    const user = await this.authService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException(
        'No hay una cuenta con ese teléfono. Registrate primero.',
      );
    }

    // El token lleva el id REAL y el rol REAL de la base. Antes iba un
    // id de relleno, así que cualquier token servía para cualquiera.
    const token = this.authService.generateToken({
      sub: user.id,
      role: user.role,
    });
    return { token, user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.findByPhone(dto.phone);
    if (!user) {
      // No se revela si el teléfono existe o no: eso permitiría
      // averiguar quién está registrado probando números.
      return { message: 'Si el teléfono está registrado, llegará un código' };
    }
    const code = this.authService.generateOtp(user.phone);
    return {
      message: 'Código enviado',
      ...(this.authService.demoOtpEnabled ? { demo_code: code } : {}),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req) {
    // Se relee de la base: el rol pudo cambiar después de emitir el
    // token, y el token no se puede "actualizar" solo.
    const user = await this.authService.findById(req.user.id);
    if (!user) throw new UnauthorizedException('La cuenta ya no existe');
    return user;
  }
}
