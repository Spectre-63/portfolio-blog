import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../lib/db';
import { createEmailService } from '../../lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const email = body.email?.toLowerCase().trim();

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = getSupabaseClient();

    // Get subscriber by email
    const { data: subscriber, error: queryError } = await db.rpc('get_subscriber_by_email', {
      p_email: email,
    });

    if (queryError || !subscriber) {
      // Don't reveal whether email exists (security)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If this email is subscribed, you will receive an unsubscribe link shortly.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email with unsubscribe link
    const siteUrl = process.env.SITE_URL || 'https://mikemcmahon.dev';
    const unsubscribeLink = `${siteUrl}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

    const emailService = createEmailService();
    const result = await emailService.send(
      email,
      'Unsubscribe from Mike McMahon\'s Blog',
      `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .button { display: inline-block; background: #3D6B7D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
      .footer { font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Unsubscribe Request</h1>
      <p>You requested to unsubscribe from Mike McMahon's blog email digest.</p>
      <p><a href="${unsubscribeLink}" class="button" data-no-track="true">Confirm Unsubscribe</a></p>
      <p>If you did not request this, you can safely ignore this email. Your subscription remains active.</p>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Mike McMahon</p>
      </div>
    </div>
  </body>
</html>
      `
    );

    if (!result.success) {
      console.error('Failed to send unsubscribe email:', result.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send unsubscribe link' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'If this email is subscribed, you will receive an unsubscribe link shortly.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send unsubscribe token error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
