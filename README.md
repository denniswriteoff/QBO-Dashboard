# QBO Dashboard

A modern financial dashboard for QuickBooks Online integration, built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

```bash
./start.sh
```

Then open http://localhost:3002

## 📋 Features

### Financial Analytics
- **Real-time KPIs**: Revenue, Expenses, Net Profit, Cash Balance, Net Margin
- **Interactive Charts**: 
  - Revenue vs Expenses Trend (Line Chart)
  - Net Profit Trend (Line Chart)  
  - Expense Breakdown (Pie Chart)
- **Time Periods**: Toggle between Month-to-Date (MTD) and Year-to-Date (YTD)
- **Expense Analysis**: Detailed category breakdown with percentage change tracking
- **Data Export**: Download reports in CSV or JSON format

### Integration
- **QuickBooks Online OAuth2**: Secure connection to QBO
- **Automatic Token Refresh**: Seamless authentication management
- **Multi-company Support**: Handle multiple QBO organizations
- **Real-time Data Sync**: Fetch latest financial data on demand

### User Experience
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Profile Management**: Update username and password
- **Connection Status**: View and manage QBO connection

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **API**: QuickBooks Online API (intuit-oauth)

## 📦 Project Structure

```
qbo_dashboard/
├── app/
│   ├── api/                   # API routes
│   │   ├── auth/              # NextAuth configuration
│   │   ├── qbo/               # QBO integration endpoints
│   │   ├── dashboard/         # Dashboard data & export
│   │   └── profile/           # User profile management
│   ├── components/            # React components
│   │   ├── ThemeToggle.tsx
│   │   ├── RevenueExpensesChart.tsx
│   │   ├── ExpenseBreakdownChart.tsx
│   │   ├── NetProfitTrendChart.tsx
│   │   ├── ProfileTab.tsx
│   │   └── QBOIntegrationTab.tsx
│   ├── login/                 # Login page
│   ├── profile/               # Profile settings page
│   ├── page.tsx               # Main dashboard page
│   ├── layout.tsx             # Root layout
│   ├── providers.tsx          # Session provider
│   └── globals.css            # Global styles
├── lib/                       # Utility libraries
│   ├── auth.ts                # NextAuth configuration
│   ├── db.ts                  # Prisma client
│   └── qbo.ts                 # QBO OAuth helpers
├── prisma/
│   └── schema.prisma          # Database schema
├── types/                     # TypeScript types
├── .env.local                 # Environment variables
├── start.sh                   # Startup script
└── SETUP.md                   # Setup documentation
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=<postgresql-connection-string>

# NextAuth
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=http://localhost:3002

# QuickBooks Online
INTUIT_CLIENT_ID=<your-client-id>
INTUIT_CLIENT_SECRET=<your-client-secret>
INTUIT_ENVIRONMENT=sandbox
INTUIT_REDIRECT_URI=http://localhost:3002/api/qbo/callback
```

### Database Setup

The dashboard uses the same database as your QBO app, which already includes:
- User accounts
- QBO tokens
- Session management

No additional database setup is required!

## 📊 Data Sources

The dashboard fetches data from QuickBooks Online using these reports:

1. **Profit & Loss Report**
   - Total Income/Revenue
   - Total Expenses
   - Net Income/Profit
   - Expense breakdown by category

2. **Balance Sheet Report**
   - Bank account balances
   - Cash and cash equivalents

3. **Company Information**
   - Company name
   - Legal name

## 🔐 Authentication

- Uses NextAuth.js with credentials provider
- Shares authentication with the main QBO app
- Session-based authentication with JWT tokens
- Secure password hashing with bcryptjs

## 🎨 UI Components

### Charts
- **Line Charts**: Built with Recharts for trend analysis
- **Pie Charts**: Visual expense category breakdown
- **Interactive Tooltips**: Detailed data on hover
- **Responsive**: Adapts to screen size

### KPI Cards
- Color-coded by metric type
- Real-time data display
- Currency formatting
- Percentage calculations

### Tables
- Sortable columns
- Period-over-period comparisons
- Percentage change indicators
- Export functionality

## 🚦 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Connect to QBO**
   - Login with your credentials
   - Click "Connect to QuickBooks Online"
   - Authorize in QBO
   - View your financial data!

## 📝 Available Scripts

- `npm run dev` - Start development server (port 3002)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client

## 🔄 Data Refresh

The dashboard automatically:
- Refreshes expired QBO tokens
- Fetches latest financial data on request
- Handles API rate limiting
- Manages multiple concurrent requests

## 📱 Responsive Design

- **Mobile**: Optimized for touch interactions
- **Tablet**: Balanced layout with readable charts
- **Desktop**: Full-width charts and detailed tables

## 🌙 Dark Mode

- System preference detection
- Manual toggle control
- Persisted in localStorage
- Smooth transitions

## 🔒 Security

- Secure OAuth2 flow
- Token encryption in database
- Protected API routes
- CSRF protection
- Environment variable management

## 📈 Performance

- Server-side rendering (SSR)
- Automatic code splitting
- Optimized bundle size
- Efficient API calls
- Cached chart data

## 🤝 Shared with QBO App

Both the main QBO app and this dashboard share:
- Database (PostgreSQL)
- User accounts
- QBO tokens
- Authentication system

This means you can use the same login credentials for both applications!

## 📚 Documentation

- See [SETUP.md](./SETUP.md) for detailed setup instructions
- QuickBooks Online API: https://developer.intuit.com/
- Next.js Documentation: https://nextjs.org/docs

## 🎉 You're All Set!

Your QBO Dashboard is ready to provide real-time financial insights from QuickBooks Online!

For any issues or questions, refer to the troubleshooting section in [SETUP.md](./SETUP.md).
