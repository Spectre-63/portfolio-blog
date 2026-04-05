import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../lib/db';

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

    // Generate unsubscribe token
    const token = crypto.getRandomValues(new Uint8Array(16)).reduce((acc, byte) => {
      return acc + byte.toString(16).padStart(2, '0');
    }, '');

    // Call stored procedure to subscribe
    const { data, error } = await db.rpc('subscribe', {
      p_email: email,
      p_unsubscribe_token: token,
    });

    if (error) {
      console.error('Database error:', error);
      // Check if it's a duplicate email error
      if (data?.error?.includes('Already subscribed')) {
        return new Response(
          JSON.stringify({ error: 'Already subscribed with this email' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to subscribe' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || 'Failed to subscribe' }),
        { status: result.error?.includes('Already') ? 409 : 500,
          headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Subscribe error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
