import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface OtpStore {
  phone: string;
  code: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  // En producción: almacenar en Redis con TTL de 5 min
  private otpStore: Map<string, OtpStore> = new Map();

  constructor(private jwtService: JwtService) {}

  generateOtp(phone: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore.set(phone, {
      phone,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
    });
    // TODO: Integrar proveedor SMS local para Venezuela
    console.log(`[DEV] OTP for ${phone}: ${code}`);
    return code;
  }

  verifyOtp(phone: string, code: string): boolean {
    const stored = this.otpStore.get(phone);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }
    if (stored.code !== code) return false;
    this.otpStore.delete(phone);
    return true;
  }

  generateToken(payload: { sub: string; role: string }): string {
    return this.jwtService.sign(payload);
  }
}
