import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenFromDatabase, createOAuthClient, getIntuitEnv } from '@/lib/qbo';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const token = await getTokenFromDatabase(session.user.id);
    
    if (!token) {
      return NextResponse.json({ connected: false });
    }

    // Try to get company info to verify connection
    const { environment } = getIntuitEnv();
    const base = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const oauthClient = createOAuthClient();
    oauthClient.setToken(token);

    try {
      const companyInfoUrl = `${base}/v3/company/${encodeURIComponent(token.realmId!)}/companyinfo/${encodeURIComponent(token.realmId!)}`;
      const response = await oauthClient.makeApiCall({
        url: companyInfoUrl,
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const companyInfo = response.json || JSON.parse(response.body || '{}');
      const companyName = companyInfo?.CompanyInfo?.CompanyName || 'Unknown Company';

      return NextResponse.json({
        connected: true,
        realmId: token.realmId,
        companyName,
      });
    } catch (apiError) {
      console.error('Failed to fetch company info:', apiError);
      return NextResponse.json({
        connected: true,
        realmId: token.realmId,
        companyName: 'Unknown Company',
      });
    }
  } catch (error) {
    console.error('QBO status check error:', error);
    return NextResponse.json({ connected: false });
  }
}

