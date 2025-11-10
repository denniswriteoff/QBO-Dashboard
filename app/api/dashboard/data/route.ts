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

    // Get current date for calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Calculate date ranges
    let fromDateStr = fromDate;
    let toDateStr = toDate;

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
      // ProfitLoss error handling
    }
    if (balanceSheetStatus !== 200 && balanceSheetStatus !== 'unknown') {
      // BalanceSheet error handling
    }
    if (companyInfoStatus !== 200 && companyInfoStatus !== 'unknown') {
      // CompanyInfo error handling
    }

    const profitLoss = profitLossRes.json || JSON.parse(profitLossRes.body || '{}');
    const balanceSheet = balanceSheetRes.json || JSON.parse(balanceSheetRes.body || '{}');
    const companyInfo = companyInfoRes.json || JSON.parse(companyInfoRes.body || '{}');

    // Process P&L data
    const revenue = extractAccountValue(profitLoss, ['Total Income', 'Total Revenue']);
    const operatingExpenses = extractAccountValue(profitLoss, ['Total Expenses']);
    const costOfGoodsSold = extractAccountValue(profitLoss, ['Total Cost of Goods Sold']);
    const expenses = operatingExpenses + costOfGoodsSold; // Include both operating expenses and COGS
    const netProfit = extractAccountValue(profitLoss, ['Net Income', 'Net Profit', 'PROFIT']);

    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Process Balance Sheet data
    const cashBalance = extractAccountValue(balanceSheet, ['Total Cash and Cash Equivalent', 'Total Bank', 'Cash and cash equivalents']);

    // Process expense breakdown
    const expenseBreakdown = extractExpenseBreakdown(profitLoss);

    // Generate monthly trend data
    const trendData = await generateMonthlyTrendData(session.user.id, oauthClient, realmId, currentYear);

    // Get previous period data for comparison
    const previousPeriodData = await getPreviousPeriodData(session.user.id, oauthClient, realmId, timeframe, fromDateStr || '', toDateStr || '');

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
      trendData,
      previousPeriodData,
      timeframe: {
        from: fromDateStr,
        to: toDateStr,
        type: timeframe
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

function extractAccountValue(report: any, accountNames: string[]): number {
  if (!report?.Rows) {
    return 0;
  }

  function searchRows(rows: any[], depth: number = 0): number {
    if (depth > 10) {
      return 0;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Check Data rows (individual account entries)
      if (row.type === 'Data' && row.ColData) {
        const name = row.ColData[0]?.value || '';
        const value = row.ColData[1]?.value || '0';

        if (accountNames.some(accountName =>
          name.toLowerCase().includes(accountName.toLowerCase())
        )) {
          const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
          if (!isNaN(numericValue)) {
            return numericValue;
          }
        }
      }

      // Check Summary sections (totals like "Total Income", "Total Expenses", "Net Income")
      if (row.Summary && row.Summary.ColData) {
        const name = row.Summary.ColData[0]?.value || '';
        const value = row.Summary.ColData[1]?.value || '0';

        if (accountNames.some(accountName =>
          name.toLowerCase().includes(accountName.toLowerCase())
        )) {
          const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
          if (!isNaN(numericValue)) {
            return numericValue;
          }
        }
      }

      // Check nested rows in sections (handle both array and object formats)
      let nestedRows = null;
      if (Array.isArray(row.Rows)) {
        nestedRows = row.Rows;
      } else if (row.Rows && row.Rows.Row) {
        nestedRows = Array.isArray(row.Rows.Row) ? row.Rows.Row : [row.Rows.Row];
      }

      if (nestedRows) {
        const nestedResult = searchRows(nestedRows, depth + 1);
        if (nestedResult !== 0) {
          return nestedResult;
        }
      }
    }
    return 0;
  }

  const rowsToSearch = report.Rows.Row || report.Rows || [];
  const result = searchRows(Array.isArray(rowsToSearch) ? rowsToSearch : [rowsToSearch]);

  return result;
}

function extractExpenseBreakdown(report: any): Array<{name: string, value: number, percentage: number}> {
  const expenses: Array<{name: string, value: number}> = [];
  let totalExpenses = 0;

  if (!report?.Rows) {
    return [];
  }

  function searchExpenseRows(rows: any[], inExpenseSection: boolean = false) {
    for (const row of rows) {
      // Look for expense section or cost of goods sold section
      const isExpenseSection = row.Header && row.Header.ColData &&
        (row.Header.ColData[0]?.value.toLowerCase().includes('expense') ||
         row.Header.ColData[0]?.value.toLowerCase().includes('cost of goods sold'));

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

      // Check nested rows (handle both array and object formats)
      let nestedRows = null;
      if (Array.isArray(row.Rows)) {
        nestedRows = row.Rows;
      } else if (row.Rows && row.Rows.Row) {
        nestedRows = Array.isArray(row.Rows.Row) ? row.Rows.Row : [row.Rows.Row];
      }

      if (nestedRows) {
        searchExpenseRows(nestedRows, isExpenseSection || inExpenseSection);
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

async function generateMonthlyTrendData(userId: string, oauthClient: any, realmId: string, year: number): Promise<Array<{month: string, revenue: number, expenses: number}>> {
  const trendData = [];
  
  const { environment } = getIntuitEnv();
  const base = environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

  try {
    // Get data for each month of the current year
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const fromDate = monthStart.toISOString().split('T')[0];
      const toDate = monthEnd.toISOString().split('T')[0];
      
      try {
        const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${fromDate}&end_date=${toDate}`;
        const response = await oauthClient.makeApiCall({
          url: profitLossUrl,
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const profitLoss = response.json || JSON.parse(response.body || '{}');

        const revenue = extractAccountValue(profitLoss, ['Total Income', 'Total Revenue']);
        const operatingExpenses = extractAccountValue(profitLoss, ['Total Expenses']);
        const costOfGoodsSold = extractAccountValue(profitLoss, ['Total Cost of Goods Sold']);
        const expenses = operatingExpenses + costOfGoodsSold; // Include both operating expenses and COGS

        trendData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          revenue: Math.abs(revenue),
          expenses: Math.abs(expenses)
        });
      } catch (error) {
        // Add zero values for months with errors
        trendData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          revenue: 0,
          expenses: 0
        });
      }
    }
  } catch (error) {
    // Handle trend data generation errors
  }
  
  return trendData;
}

async function getPreviousPeriodData(userId: string, oauthClient: any, realmId: string, timeframe: string, fromDate: string, toDate: string): Promise<Array<{name: string, value: number}>> {
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

    const { environment } = getIntuitEnv();
    const base = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const profitLossUrl = `${base}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${previousFromDate}&end_date=${previousToDate}`;
    const response = await oauthClient.makeApiCall({
      url: profitLossUrl,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const previousProfitLoss = response.json || JSON.parse(response.body || '{}');

    return extractExpenseBreakdown(previousProfitLoss);
  } catch (error) {
    return [];
  }
}

