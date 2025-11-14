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
    let fromDateStr = searchParams.get('fromDate');
    let toDateStr = searchParams.get('toDate');

    if (!fromDateStr || !toDateStr) {
      if (timeframe === 'YEAR') {
        fromDateStr = `${currentYear}-01-01`;
        toDateStr = `${currentYear}-12-31`;
      } else if (timeframe === 'MONTH') {
        const monthStart = new Date(currentYear, currentMonth - 1, 1);
        const monthEnd = new Date(currentYear, currentMonth, 0);
        fromDateStr = monthStart.toISOString().split('T')[0];
        toDateStr = monthEnd.toISOString().split('T')[0];
      }
    }

    const { environment } = getIntuitEnv();
    const base = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const oauthClient = createOAuthClient();
    oauthClient.setToken(token);

    // Fetch P&L, Balance Sheet, and Company Info
    const realmId = encodeURIComponent(token.realmId);
    const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${fromDateStr}&end_date=${toDateStr}`;
    const balanceSheetUrl = `${base}/v3/company/${realmId}/reports/BalanceSheet?start_date=${fromDateStr}&end_date=${toDateStr}`;
    const companyInfoUrl = `${base}/v3/company/${realmId}/companyinfo/${realmId}`;

    const [profitLossRes, balanceSheetRes, companyInfoRes] = await Promise.all([
      oauthClient.makeApiCall({ url: profitLossUrl, method: 'GET', headers: { Accept: 'application/json' } }),
      oauthClient.makeApiCall({ url: balanceSheetUrl, method: 'GET', headers: { Accept: 'application/json' } }),
      oauthClient.makeApiCall({ url: companyInfoUrl, method: 'GET', headers: { Accept: 'application/json' } }),
    ]);

    // Get status codes and messages
    const profitLossStatus = profitLossRes?.getResponseCode?.() || profitLossRes?.status || 'unknown';
    const balanceSheetStatus = balanceSheetRes?.getResponseCode?.() || balanceSheetRes?.status || 'unknown';
    const companyInfoStatus = companyInfoRes?.getResponseCode?.() || companyInfoRes?.status || 'unknown';

    // Handle error responses
    if (profitLossStatus !== 200 && profitLossStatus !== 'unknown') {
      console.error('ProfitLoss API error:', profitLossStatus, profitLossRes?.body);
    }
    if (balanceSheetStatus !== 200 && balanceSheetStatus !== 'unknown') {
      console.error('BalanceSheet API error:', balanceSheetStatus, balanceSheetRes?.body);
    }
    if (companyInfoStatus !== 200 && companyInfoStatus !== 'unknown') {
      console.error('CompanyInfo API error:', companyInfoStatus, companyInfoRes?.body);
    }

    const profitLoss = profitLossRes.json || JSON.parse(profitLossRes.body || '{}');
    const balanceSheet = balanceSheetRes.json || JSON.parse(balanceSheetRes.body || '{}');
    const companyInfo = companyInfoRes.json || JSON.parse(companyInfoRes.body || '{}');

    // Process P&L data directly from column summaries
    const { revenue, operatingExpenses, costOfGoodsSold, otherExpenses, netProfit } = extractProfitLossSummary(profitLoss);
    const expenses = operatingExpenses + costOfGoodsSold; // Include both operating expenses and COGS

    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Process Balance Sheet data directly from column summaries
    const { cashBalance } = extractBalanceSheetSummary(balanceSheet);

    // Process expense breakdown
    const expenseBreakdown = extractExpenseBreakdown(profitLoss);

    return NextResponse.json({
      organisation: {
        name: companyInfo?.CompanyInfo?.CompanyName || 'Unknown',
        shortCode: companyInfo?.CompanyInfo?.LegalName || ''
      },
      kpis: {
        revenue: Math.abs(revenue),
        expenses: Math.abs(expenses),
        netProfit: netProfit,
        netMargin,
        cashBalance: Math.abs(cashBalance)
      },
      expenseBreakdown,
      timeframe: {
        from: fromDateStr,
        to: toDateStr,
        type: timeframe
      }
    });

  } catch (error) {
    console.error('General dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch general data' }, { status: 500 });
  }
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

function extractBalanceSheetSummary(report: any): {
  cashBalance: number;
} {
  const result = {
    cashBalance: 0
  };

  if (!report?.Rows?.Row) {
    return result;
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  // Recursive function to search through nested rows for the cash summary
  function findCashSummary(rows: any[]): number {
    for (const row of rows) {
      // Check if this is the Summary section for "Total Cash and Cash Equivalent"
      if (row.Summary && row.Summary.ColData) {
        const name = row.Summary.ColData[0]?.value || '';
        const value = row.Summary.ColData[1]?.value || '0';
        const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

        if (name === 'Total Cash and Cash Equivalent' && !isNaN(numericValue)) {
          return numericValue;
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
        const nestedResult = findCashSummary(nestedRows);
        if (nestedResult !== 0) {
          return nestedResult;
        }
      }
    }
    return 0;
  }

  result.cashBalance = findCashSummary(rows);
  return result;
}

function extractExpenseBreakdown(report: any): Array<{name: string, value: number, percentage: number}> {
  const expenses: Array<{name: string, value: number}> = [];
  let totalExpenses = 0;

  if (!report?.Rows?.Row) {
    return [];
  }

  const rows = Array.isArray(report.Rows.Row) ? report.Rows.Row : [report.Rows.Row];

  // Find the EXPENSES, OTHER EXPENSES, and COST OF GOODS SOLD sections
  function findExpenseSections(rows: any[]): any[] {
    const sections = [];

    for (const row of rows) {
      // Check if this is the EXPENSES, OTHER EXPENSES, or COST OF GOODS SOLD section
      if (row.Header && row.Header.ColData) {
        const headerValue = row.Header.ColData[0]?.value;
        if (headerValue === 'EXPENSES' || headerValue === 'OTHER EXPENSES' ||
            headerValue === 'COST OF GOODS SOLD' || headerValue === 'COST OF SALES' ||
            headerValue === 'COGS') {
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
