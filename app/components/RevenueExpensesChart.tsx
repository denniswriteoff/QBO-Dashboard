'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendData {
  month: string
  revenue: number
  expenses: number
}

interface RevenueExpensesChartProps {
  data: TrendData[]
  loading?: boolean
}

export default function RevenueExpensesChart({ data, loading = false }: RevenueExpensesChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#2A2D31] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading chart data...</div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#2A2D31] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-600 dark:text-gray-400">No trend data available</div>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {entry.dataKey === 'revenue' ? 'Revenue' : 'Expenses'}: {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white dark:bg-[#2A2D31] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Revenue vs Expenses Trend</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Monthly comparison over time</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              className="dark:stroke-gray-400"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              className="dark:stroke-gray-400"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              name="Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
              name="Expenses"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

