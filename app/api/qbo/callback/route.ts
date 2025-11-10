import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOAuthClient, saveTokenToDatabase } from '@/lib/qbo';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is the user ID we passed
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  if (error) {
    console.error('QBO OAuth error:', error);
    return NextResponse.redirect(new URL(`/?error=${error}`, req.url));
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(new URL('/?error=missing_params', req.url));
  }

  try {
    // Verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: state },
    });

    if (!user) {
      console.error('User not found for userId:', state);
      return NextResponse.redirect(new URL('/?error=user_not_found', req.url));
    }

    // Also verify the session matches if available (optional but recommended for security)
    const session = await getServerSession(authOptions);
    if (session?.user?.id && session.user.id !== state) {
      console.error('Session user ID mismatch. Session:', session.user.id, 'State:', state);
      return NextResponse.redirect(new URL('/?error=session_mismatch', req.url));
    }

    const oauthClient = createOAuthClient();
    const authResponse = await oauthClient.createToken(req.url);
    const token = authResponse.getToken();

    // Add realmId to token
    const tokenWithRealm = {
      ...token,
      realmId,
    };

    // Save to database
    await saveTokenToDatabase(tokenWithRealm, state);

    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/?success=qbo_connected', req.url));
  } catch (err) {
    console.error('QBO token exchange error:', err);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', req.url));
  }
}

