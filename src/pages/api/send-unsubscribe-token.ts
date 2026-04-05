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
    const { data: subscribers, error: queryError } = await db.rpc('get_subscriber_by_email', {
      p_email: email,
    });

    if (queryError || !subscribers || (Array.isArray(subscribers) && subscribers.length === 0)) {
      // Don't reveal whether email exists (security)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If this email is subscribed, you will receive an unsubscribe link shortly.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle both single object and array responses from RPC
    const subscriber = Array.isArray(subscribers) ? subscribers[0] : subscribers;
    if (!subscriber || !subscriber.unsubscribe_token) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If this email is subscribed, you will receive an unsubscribe link shortly.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email with unsubscribe token (as plain text, no clickable link)
    const siteUrl = process.env.SITE_URL || 'https://mikemcmahon.dev';
    const unsubscribePage = `${siteUrl}/unsubscribe`;

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
      .code { background: #f5f5f5; padding: 12px; border-radius: 4px; font-family: monospace; word-break: break-all; margin: 15px 0; }
      .footer { font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Unsubscribe Request</h1>
      <p>You requested to unsubscribe from Mike McMahon's blog email digest.</p>

      <h3>To confirm, copy this token:</h3>
      <div class="code">${subscriber.unsubscribe_token}</div>

      <p>Then visit <a href="${unsubscribePage}">the unsubscribe page</a> and paste it to confirm removal.</p>

      <p style="margin-top: 20px; font-size: 0.9rem;">If you did not request this, you can safely ignore this email. Your subscription remains active.</p>

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
