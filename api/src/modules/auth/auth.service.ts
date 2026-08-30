import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../../database/db.service';

export interface OtpStore {
  phone: string;
  code: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  // En producción: almacenar en Redis con TTL de 5 min
  private otpStore: Map<string, OtpStore> = new Map();

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private readonly db: DbService,
  ) {}

  private assertDb() {
    if (!this.db.isReady) {
      throw new ServiceUnavailableException(
        'La base de datos no está disponible',
      );
    }
  }

  /**
   * Normaliza el teléfono a formato internacional.
   *
   * Sin esto el mismo usuario puede tener tres cuentas: 04121234567,
   * +584121234567 y 4121234567. Ya pasó en la app web.
   */
  static normalizePhone(raw: string): string {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.startsWith('58')) return `+${digits}`;
    if (digits.startsWith('0')) return `+58${digits.slice(1)}`;
    if (digits.length === 10) return `+58${digits}`;
    return `+${digits}`;
  }

  /** Alta o recuperación del usuario por teléfono. */
  async upsertUser(input: {
    phone: string;
    name?: string;
    email?: string;
    id_doc?: string;
    role?: 'passenger' | 'driver';
  }) {
    this.assertDb();
    const phone = AuthService.normalizePhone(input.phone);

    const existing = await this.db.one<any>(
      `SELECT id, name, phone, email, role, status, rating, completed_trips
         FROM users WHERE phone = $1`,
      [phone],
    );
    if (existing) {
      if (existing.status !== 'active') {
        throw new UnauthorizedException(
          `Tu cuenta está ${existing.status}. Escribinos para revisarlo.`,
        );
      }
      return { user: existing, is_new: false };
    }

    const rows = await this.db.query<any>(
      `INSERT INTO users (name, phone, email, id_doc, role, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, name, phone, email, role, status, rating, completed_trips`,
      [
        input.name ?? null,
        phone,
        input.email ?? null,
        input.id_doc ?? null,
        input.role ?? 'passenger',
      ],
    );
    return { user: rows[0], is_new: true };
  }

  async findByPhone(phone: string) {
    this.assertDb();
    return this.db.one<any>(
      `SELECT id, name, phone, email, role, status, rating, completed_trips
         FROM users WHERE phone = $1`,
      [AuthService.normalizePhone(phone)],
    );
  }

  async findById(id: string) {
    this.assertDb();
    return this.db.one<any>(
      `SELECT id, name, phone, email, role, status, rating, completed_trips
         FROM users WHERE id = $1`,
      [id],
    );
  }

  generateOtp(rawPhone: string): string {
    const phone = AuthService.normalizePhone(rawPhone);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore.set(phone, {
      phone,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
    });
    // El envío por WhatsApp queda pendiente de la aprobación de Meta.
    // Mientras tanto el código se registra en el log del servidor y,
    // solo si AUTH_DEMO_OTP=1, se devuelve en la respuesta — para que
    // la demo sea probable sin mensajería. En producción esa variable
    // NO se pone y el código no sale nunca del servidor.
    this.logger.log(`OTP para ${phone}: ${code}`);
    return code;
  }

  get demoOtpEnabled(): boolean {
    return process.env.AUTH_DEMO_OTP === '1';
  }

  verifyOtp(rawPhone: string, code: string): boolean {
    const phone = AuthService.normalizePhone(rawPhone);
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
