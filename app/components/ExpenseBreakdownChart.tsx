'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ExpenseData {
  name: string
  value: number
  percentage: number
}

interface ExpenseBreakdownChartProps {
  data: ExpenseData[]
  loading?: boolean
}

// Color palette for the pie chart segments
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6366f1', // indigo
]

export default function ExpenseBreakdownChart({ data, loading = false }: ExpenseBreakdownChartProps) {
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
          <div className="text-sm text-gray-600 dark:text-gray-400">No expense data available</div>
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Percentage: {data.payload.percentage.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#2A2D31] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Expense Breakdown</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Distribution of operating expenses by category</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

