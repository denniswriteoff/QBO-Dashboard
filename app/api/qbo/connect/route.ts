import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOAuthClient, getDefaultScopes } from '@/lib/qbo';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const oauthClient = createOAuthClient();
    const scopes = getDefaultScopes();
    const authUri = oauthClient.authorizeUri({
      scope: scopes,
      state: session.user.id, // Pass user ID as state
    });

    return NextResponse.redirect(authUri);
  } catch (error) {
    console.error('QBO connect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}

