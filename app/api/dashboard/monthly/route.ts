import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getValidToken, createOAuthClient, getIntuitEnv } from '@/lib/qbo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Get user's QBO token
    const token = await getValidToken(session.user.id);

    if (!token?.access_token || !token?.realmId) {
      return NextResponse.json({ error: 'No QBO connection found' }, { status: 400 });
    }

    const { environment } = getIntuitEnv();
    const base = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const oauthClient = createOAuthClient();
    oauthClient.setToken(token);
    const realmId = encodeURIComponent(token.realmId);

    // Generate monthly trend data
    const trendData = await generateMonthlyTrendData(oauthClient, realmId, year, base);

    return NextResponse.json({
      trendData,
      year
    });

  } catch (error) {
    console.error('Monthly dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly data' }, { status: 500 });
  }
}

async function generateMonthlyTrendData(oauthClient: any, realmId: string, year: number, base: string): Promise<Array<{month: string, revenue: number, expenses: number}>> {
  const trendData = [];

  try {
    // Process months sequentially with delays to avoid rate limiting
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const fromDate = monthStart.toISOString().split('T')[0];
      const toDate = monthEnd.toISOString().split('T')[0];

      const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${fromDate}&end_date=${toDate}`;

      try {
        const response = await oauthClient.makeApiCall({
          url: profitLossUrl,
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const profitLoss = response.json || JSON.parse(response.body || '{}');

        const { revenue, operatingExpenses, costOfGoodsSold, otherExpenses } = extractProfitLossSummary(profitLoss);
        const expenses = operatingExpenses + costOfGoodsSold + otherExpenses; // Include both operating expenses and COGS

        trendData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          revenue: Math.abs(revenue),
          expenses: Math.abs(expenses)
        });
      } catch (error: any) {
        // Handle rate limiting with retry
        if (error?.response?.status === 429) {
          console.log(`Rate limited for ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}, waiting before retry...`);
          const retryAfter = error.response.headers?.['retry-after'] || '1';
          const waitTime = parseInt(retryAfter) * 1000;

          await new Promise(resolve => setTimeout(resolve, waitTime));

          try {
            // Retry the request
            const retryResponse = await oauthClient.makeApiCall({
              url: profitLossUrl,
              method: 'GET',
              headers: { Accept: 'application/json' },
            });

            const retryProfitLoss = retryResponse.json || JSON.parse(retryResponse.body || '{}');

            const { revenue, operatingExpenses, costOfGoodsSold, otherExpenses } = extractProfitLossSummary(retryProfitLoss);
            const expenses = operatingExpenses + costOfGoodsSold + otherExpenses;

            trendData.push({
              month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
              revenue: Math.abs(revenue),
              expenses: Math.abs(expenses)
            });
          } catch (retryError) {
            console.error(`Failed retry for ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:`, retryError);
            trendData.push({
              month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
              revenue: 0,
              expenses: 0
            });
          }
        } else {
          console.error(`Error fetching data for ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:`, error);
          trendData.push({
            month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            revenue: 0,
            expenses: 0
          });
        }
      }

      // Add delay between requests to stay under 10 concurrent/second limit
      if (month < 12) {
        await new Promise(resolve => setTimeout(resolve, 125)); // ~8 requests per second
      }
    }
  } catch (error) {
    console.error('Trend data generation error:', error);
  }

  return trendData;
}

function extractProfitLossSummary(report: any): {
  revenue: number;
  operatingExpenses: number;
  costOfGoodsSold: number;
  otherExpenses: number;
  netProfit: number;
} {
  const result = {
    revenue: 0,
    operatingExpenses: 0,
    costOfGoodsSold: 0,
    otherExpenses: 0,
    netProfit: 0
  };

  if (!report?.Rows?.Row) {
    return result;
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  for (const row of rows) {
    if (row.Summary && row.Summary.ColData) {
      const name = row.Summary.ColData[0]?.value || '';
      const value = row.Summary.ColData[1]?.value || '0';
      const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

      if (!isNaN(numericValue)) {
        switch (name) {
          case 'Total Income':
            result.revenue = numericValue;
            break;
          case 'Total Expenses':
            result.operatingExpenses = numericValue;
            break;
          case 'Total Cost of Goods Sold':
            result.costOfGoodsSold = numericValue;
            break;
          case 'Total Other Expenses':
            result.otherExpenses = numericValue;
            break;
          case 'PROFIT':
            result.netProfit = numericValue;
            break;
        }
      }
    }
  }

  return result;
}
