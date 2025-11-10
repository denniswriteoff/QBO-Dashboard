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
    const format = searchParams.get('format') || 'csv';
    const timeframe = searchParams.get('timeframe') || 'YEAR';

    // Get user's QBO token
    const token = await getValidToken(session.user.id);
    
    if (!token?.access_token || !token?.realmId) {
      return NextResponse.json({ error: 'No QBO connection found' }, { status: 400 });
    }

    // Get current date for calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Calculate date ranges
    let fromDateStr: string;
    let toDateStr: string;

    if (timeframe === 'YEAR') {
      fromDateStr = `${currentYear}-01-01`;
      toDateStr = `${currentYear}-12-31`;
    } else {
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0);
      fromDateStr = monthStart.toISOString().split('T')[0];
      toDateStr = monthEnd.toISOString().split('T')[0];
    }

    const { environment } = getIntuitEnv();
    const base = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const oauthClient = createOAuthClient();
    oauthClient.setToken(token);

    // Fetch P&L report
    const realmId = encodeURIComponent(token.realmId);
    const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${fromDateStr}&end_date=${toDateStr}`;

    const profitLossRes = await oauthClient.makeApiCall({ 
      url: profitLossUrl, 
      method: 'GET', 
      headers: { Accept: 'application/json' } 
    });

    const profitLoss = profitLossRes.json || JSON.parse(profitLossRes.body || '{}');
    const expenseBreakdown = extractExpenseBreakdown(profitLoss);

    if (format === 'csv') {
      // Generate CSV
      const csvLines = [
        'Category,Amount,Percentage',
        ...expenseBreakdown.map(expense => 
          `"${expense.name}",${expense.value},${expense.percentage.toFixed(2)}%`
        )
      ];
      const csvContent = csvLines.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial-report-${timeframe.toLowerCase()}.csv"`,
        },
      });
    } else {
      // Generate JSON
      const jsonContent = JSON.stringify({
        timeframe: {
          from: fromDateStr,
          to: toDateStr,
          type: timeframe
        },
        expenseBreakdown
      }, null, 2);

      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="financial-report-${timeframe.toLowerCase()}.json"`,
        },
      });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

function extractExpenseBreakdown(report: any): Array<{name: string, value: number, percentage: number}> {
  const expenses: Array<{name: string, value: number}> = [];
  let totalExpenses = 0;

  if (!report?.Rows) {
    return [];
  }

  function searchExpenseRows(rows: any[], inExpenseSection: boolean = false) {
    for (const row of rows) {
      // Look for expense section
      const isExpenseSection = row.Header && row.Header.ColData && 
        row.Header.ColData[0]?.value.toLowerCase().includes('expense');

      if (row.type === 'Data' && row.ColData && inExpenseSection) {
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

      // Check nested rows
      if (row.Rows && Array.isArray(row.Rows)) {
        searchExpenseRows(row.Rows, isExpenseSection || inExpenseSection);
      }
    }
  }

  searchExpenseRows(report.Rows.Row || []);

  // Calculate percentages and sort by value
  return expenses
    .map(expense => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.value / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 expenses
}

