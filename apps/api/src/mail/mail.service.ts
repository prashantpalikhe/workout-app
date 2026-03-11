import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Env } from '../config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY', { infer: true }));
    this.from = this.config.get('MAIL_FROM', { infer: true });
    this.frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
  }

  async sendPasswordReset(to: string, userName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Reset your password',
      html: passwordResetHtml(userName, resetUrl),
    });

    if (error) {
      this.logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    this.logger.log(`Password reset email sent to ${to}`);
  }
}

// ── Email Templates ─────────────────────────────

function passwordResetHtml(userName: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="margin-bottom: 16px;">Reset your password</h2>
  <p>Hi ${userName},</p>
  <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 15 minutes.</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
      Reset Password
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">Workout App</p>
</body>
</html>`;
}
