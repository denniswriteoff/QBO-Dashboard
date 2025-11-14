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
    const timeframe = searchParams.get('timeframe') || 'YEAR';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

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

    // Get previous period data for comparison
    const previousPeriodData = await getPreviousPeriodData(oauthClient, realmId, timeframe, fromDate || '', toDate || '', base);

    return NextResponse.json({
      previousPeriodData,
      timeframe: {
        from: fromDate,
        to: toDate,
        type: timeframe
      }
    });

  } catch (error) {
    console.error('Previous period dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch previous period data' }, { status: 500 });
  }
}

async function getPreviousPeriodData(oauthClient: any, realmId: string, timeframe: string, fromDate: string, toDate: string, base: string): Promise<Array<{name: string, value: number}>> {
  try {
    let previousFromDate: string;
    let previousToDate: string;

    if (timeframe === 'YEAR') {
      // Get previous year data
      const currentYear = new Date(fromDate).getFullYear();
      const previousYear = currentYear - 1;
      previousFromDate = `${previousYear}-01-01`;
      previousToDate = `${previousYear}-12-31`;
    } else {
      // Get previous month data
      const currentDate = new Date(fromDate);
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      previousFromDate = previousMonth.toISOString().split('T')[0];
      previousToDate = previousMonthEnd.toISOString().split('T')[0];
    }

    const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${previousFromDate}&end_date=${previousToDate}`;
    const response = await oauthClient.makeApiCall({
      url: profitLossUrl,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const previousProfitLoss = response.json || JSON.parse(response.body || '{}');

    return extractExpenseBreakdown(previousProfitLoss);
  } catch (error) {
    console.error('Previous period data fetch error:', error);
    return [];
  }
}

function extractExpenseBreakdown(report: any): Array<{name: string, value: number, percentage: number}> {
  const expenses: Array<{name: string, value: number}> = [];
  let totalExpenses = 0;

  if (!report?.Rows?.Row) {
    return [];
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  // Find the EXPENSES and OTHER EXPENSES sections directly
  function findExpenseSections(rows: any[]): any[] {
    const sections = [];

    for (const row of rows) {
      // Check if this is the EXPENSES or OTHER EXPENSES section
      if (row.Header && row.Header.ColData) {
        const headerValue = row.Header.ColData[0]?.value;
        if (headerValue === 'EXPENSES' || headerValue === 'OTHER EXPENSES') {
          sections.push(row);
        }
      }

      // Recursively search in nested rows
      let nestedRows = null;
      if (Array.isArray(row.Rows)) {
        nestedRows = row.Rows;
      } else if (row.Rows && row.Rows.Row) {
        nestedRows = Array.isArray(row.Rows.Row) ? row.Rows.Row : [row.Rows.Row];
      }

      if (nestedRows) {
        sections.push(...findExpenseSections(nestedRows));
      }
    }
    return sections;
  }

  const expenseSections = findExpenseSections(rows);

  // Extract individual expense items from all expense sections
  for (const section of expenseSections) {
    if (section?.Rows?.Row) {
      const expenseRows = Array.isArray(section.Rows.Row)
        ? section.Rows.Row
        : [section.Rows.Row];

      for (const row of expenseRows) {
        if (row.type === 'Data' && row.ColData) {
          const name = row.ColData[0]?.value || '';
          const value = row.ColData[1]?.value || '0';

          if (name && !name.toLowerCase().includes('total')) {
            const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

            if (!isNaN(numericValue) && numericValue > 0) {
              expenses.push({ name, value: Math.abs(numericValue) });
              totalExpenses += Math.abs(numericValue);
            }
          }
        }
      }
    }
  }

  // Calculate percentages and sort by value
  return expenses
    .map(expense => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.value / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 expenses
}
