import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revokeToken } from '@/lib/qbo';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await revokeToken(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QBO revoke error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke QBO connection' },
      { status: 500 }
    );
  }
}

