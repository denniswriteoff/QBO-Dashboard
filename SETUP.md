# Quick Setup Guide

## 🚀 QBO Dashboard Setup Complete!

Your QuickBooks Online Dashboard is ready to use. Here's how to get started:

### 1. **Start the Dashboard**
```bash
cd /Users/cheatdreams/qbo_dashboard
./start.sh
```

Or manually:
```bash
cd /Users/cheatdreams/qbo_dashboard
npm install
npx prisma generate
npm run dev
```

### 2. **Access the Dashboard**
- **URL**: http://localhost:3002
- **Login**: Use the same credentials from your QBO app
- **Database**: Shares the same database as your QBO app

### 3. **Connect QuickBooks Online**
1. Login to the dashboard
2. Click "Connect to QuickBooks Online" button
3. Authorize the connection in QBO
4. View your financial data!

### 4. **Features Available**
- ✅ **KPI Cards**: Revenue, Expenses, Net Profit, Cash Balance
- ✅ **Expense Breakdown**: Detailed category analysis
- ✅ **Timeframe Toggle**: Switch between MTD and YTD
- ✅ **Export Data**: Download CSV or JSON reports
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **Dark Mode**: Theme toggle support
- ✅ **Monthly Trends**: Revenue vs Expenses charts
- ✅ **Net Profit Trend**: Visual profit tracking

### 5. **Port Configuration**
- **QBO App**: http://localhost:3000
- **QBO Dashboard**: http://localhost:3002

Both applications share the same database and user authentication.

### 6. **Environment Variables**
The dashboard uses the following environment variables from `.env.local`:

```
DATABASE_URL=<shared-database-url>
NEXTAUTH_SECRET=<auth-secret>
NEXTAUTH_URL=http://localhost:3002
INTUIT_CLIENT_ID=<your-client-id>
INTUIT_CLIENT_SECRET=<your-client-secret>
INTUIT_ENVIRONMENT=sandbox
INTUIT_REDIRECT_URI=http://localhost:3002/api/qbo/callback
```

### 7. **Troubleshooting**
- If you get module errors, run: `npm install`
- If database errors, check your `.env.local` file
- If QBO connection fails, verify your Intuit API credentials
- Make sure port 3002 is not already in use

### 8. **Production Deployment**
Both applications can be deployed together:
- Use the same database URL
- Use the same environment variables
- Update NEXTAUTH_URL and INTUIT_REDIRECT_URI to production URLs
- Deploy to Vercel, Docker, or your preferred platform

## 🎉 You're All Set!

Your QBO dashboard is now ready to provide real-time financial insights from your QuickBooks Online data!

## 📊 Dashboard Features

### KPIs
- **Revenue**: Total income for the selected period
- **Expenses**: Total expenses for the selected period
- **Net Profit**: Revenue minus expenses
- **Net Margin**: Net profit as a percentage of revenue
- **Cash Balance**: Current bank account balances

### Charts
- **Revenue vs Expenses Trend**: Line chart showing monthly comparison
- **Net Profit Trend**: Line chart showing monthly net profit
- **Expense Breakdown**: Pie chart showing expense categories

### Data Export
- Export financial data in CSV or JSON format
- Filtered by selected timeframe (MTD or YTD)

### Profile Settings
- Update username and password
- Manage QuickBooks Online connection
- View connection status

## 🔧 Technical Details

### Tech Stack
- **Framework**: Next.js 14
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS, Recharts for visualizations
- **API**: QuickBooks Online OAuth2

### API Routes
- `/api/auth/[...nextauth]` - Authentication
- `/api/qbo/connect` - QBO OAuth connection
- `/api/qbo/callback` - QBO OAuth callback
- `/api/qbo/status` - QBO connection status
- `/api/qbo/revoke` - Revoke QBO connection
- `/api/dashboard/data` - Fetch dashboard data
- `/api/dashboard/export` - Export data
- `/api/profile/update` - Update user profile

### Data Sources
- **Profit & Loss Report**: Revenue, expenses, net profit
- **Balance Sheet Report**: Cash balance
- **Company Info**: Organization details

The dashboard automatically refreshes tokens and handles QBO API pagination.

