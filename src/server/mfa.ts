import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Configure TOTP options
authenticator.options = {
  window: 1, // Allow 1 step (30s) clock skew
};

/** MFA 전용 Secret 키 생성 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/** Google Authenticator / Authy 등에 등록할 OTP Auth URI 및 QR 코드 Data URL 생성 */
export async function generateMfaQrCode(email: string, secret: string, appName: string = 'Kairos'): Promise<{
  otpauthUrl: string;
  qrCodeUrl: string;
}> {
  const otpauthUrl = authenticator.keyuri(email, appName, secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
  return { otpauthUrl, qrCodeUrl };
}

/** TOTP OTP 토큰 검증 */
export function verifyMfaToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
