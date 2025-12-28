import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'DormUp';

export interface SendVerificationEmailParams {
  to: string;
  token: string;
  name?: string;
}

export async function sendVerificationEmail({ to, token, name }: SendVerificationEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Подтвердите ваш email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #014D40; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">DormUp</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 40px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Подтвердите ваш email адрес</h2>
          <p style="color: #4b5563; font-size: 16px;">
            ${name ? `Привет, ${name}!` : 'Привет!'}
          </p>
          <p style="color: #4b5563; font-size: 16px;">
            Спасибо за регистрацию в DormUp! Пожалуйста, подтвердите ваш email адрес, нажав на кнопку ниже:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #014D40; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Подтвердить email
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Или скопируйте и вставьте эту ссылку в браузер:
          </p>
          <p style="color: #014D40; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Эта ссылка действительна в течение 24 часов. Если вы не создавали аккаунт, просто проигнорируйте это письмо.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} DormUp. Все права защищены.</p>
        </div>
      </body>
    </html>
  `;

  const emailText = `
Привет${name ? `, ${name}` : ''}!

Спасибо за регистрацию в DormUp! Пожалуйста, подтвердите ваш email адрес, перейдя по ссылке ниже:

${verificationUrl}

Эта ссылка действительна в течение 24 часов. Если вы не создавали аккаунт, просто проигнорируйте это письмо.

© ${new Date().getFullYear()} DormUp. Все права защищены.
  `.trim();

  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: 'Подтвердите ваш email адрес DormUp',
      html: emailHtml,
      text: emailText,
    });

    return { success: true, data: result.data, error: null };
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return { success: false, data: null, error: error.message || 'Failed to send email' };
  }
}

