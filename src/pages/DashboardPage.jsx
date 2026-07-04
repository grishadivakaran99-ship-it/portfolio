import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, Target, RefreshCw,
  ArrowUpRight, ArrowDownRight, Brain, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/ui/StatCard';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { formatCurrency, formatShortDate, getCurrentMonth, getCurrentYear, getMonthName } from '../lib/utils';
import { CATEGORY_COLORS } from '../types';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const {
    transactions,
    budgets,
    monthlyTrends,
    stockRecommendation,
    dashboardStats,
    categoryStats,
    loading,
    refreshAll
  } = useData();

  const month = getCurrentMonth();
  const year = getCurrentYear();

  if (loading) return <PageLoader text="Loading dashboard..." />;

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there';
  const recentTransactions = transactions.slice(0, 8);
  const topBudgets = budgets.slice(0, 4);
  const topCategories = categoryStats.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Hello, {displayName.split(' ')[0]}
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">{getMonthName(month, year)} Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} className="btn-secondary p-2.5" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <Link to="/transactions" className="btn-primary">
            <Plus size={16} />
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          amount={dashboardStats.totalIncome}
          subtitle={getMonthName(month)}
          icon={<TrendingUp size={20} className="text-success-600" />}
          colorClass="text-success-600"
          bgClass="bg-success-50"
        />
        <StatCard
          title="Total Expenses"
          amount={dashboardStats.totalExpenses}
          subtitle={getMonthName(month)}
          icon={<TrendingDown size={20} className="text-danger-600" />}
          colorClass="text-danger-600"
          bgClass="bg-danger-50"
        />
        <StatCard
          title="Net Savings"
          amount={dashboardStats.totalSavings}
          subtitle="Income minus expenses"
          icon={<Wallet size={20} className="text-brand-600" />}
          colorClass={dashboardStats.totalSavings >= 0 ? 'text-brand-600' : 'text-danger-600'}
          bgClass="bg-brand-50"
        />
        <div className="card-hover animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Budget Used</p>
              <p className={`text-2xl font-bold mt-1 ${
                dashboardStats.budgetUtilization > 100 ? 'text-danger-600' :
                dashboardStats.budgetUtilization > 80 ? 'text-warning-600' : 'text-brand-600'
              }`}>
                {dashboardStats.budgetUtilization}%
              </p>
              <p className="text-xs text-surface-400 mt-1">of total budget</p>
            </div>
            <div className="p-3 rounded-xl bg-warning-50">
              <Target size={20} className="text-warning-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  dashboardStats.budgetUtilization > 100 ? 'bg-danger-500' :
                  dashboardStats.budgetUtilization > 80 ? 'bg-warning-500' : 'bg-brand-500'
                }`}
                style={{ width: `${Math.min(dashboardStats.budgetUtilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly Trend Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Monthly Spending Trend</h2>
            <span className="badge badge-blue">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrends} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `Rs.${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value)]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#colorIncome)" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpense)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Budget Progress</h2>
            <Link to="/budgets" className="text-xs text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          {topBudgets.length === 0 ? (
            <div className="text-center py-8">
              <Target size={32} className="text-surface-300 mx-auto mb-2" />
              <p className="text-surface-400 text-sm">No budgets set</p>
              <Link to="/budgets" className="text-brand-600 text-xs hover:underline mt-1 inline-block">
                + Add budget
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {topBudgets.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-surface-700 truncate max-w-[120px]">{b.category}</span>
                    <span className={`text-xs font-medium ${
                      b.percentage > 100 ? 'text-danger-600' :
                      b.percentage > 80 ? 'text-warning-600' : 'text-surface-500'
                    }`}>
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        b.percentage > 100 ? 'bg-danger-500' :
                        b.percentage > 80 ? 'bg-warning-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-surface-400">
                    <span>{formatCurrency(b.spent)}</span>
                    <span>{formatCurrency(b.monthly_limit)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10">
              <Wallet size={36} className="text-surface-300 mx-auto mb-2" />
              <p className="text-surface-400 text-sm">No transactions yet</p>
              <Link to="/transactions" className="text-brand-600 text-xs hover:underline mt-1 inline-block">
                + Add first transaction
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="table-header">Merchant</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Date</th>
                    <th className="table-header text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            t.type === 'income' ? 'bg-success-50' : 'bg-danger-50'
                          }`}>
                            {t.type === 'income'
                              ? <ArrowUpRight size={14} className="text-success-600" />
                              : <ArrowDownRight size={14} className="text-danger-600" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-surface-900 text-sm leading-tight">
                              {t.merchant || 'Unknown'}
                            </p>
                            {t.description && (
                              <p className="text-xs text-surface-400 truncate max-w-[150px]">{t.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          className="badge text-white text-xs"
                          style={{ backgroundColor: CATEGORY_COLORS[t.category] ?? '#94a3b8' }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td className="table-cell text-surface-500">{formatShortDate(t.date)}</td>
                      <td className={`table-cell text-right font-semibold ${
                        t.type === 'income' ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stock Widget */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Stock Picks</h2>
            <span className="badge badge-blue">AI</span>
          </div>
          {stockRecommendation ? (
            <div className="space-y-3">
              <p className="text-xs text-surface-500 leading-relaxed bg-surface-50 rounded-lg p-3">
                {stockRecommendation.recommendation_text}
              </p>
              {(stockRecommendation.stocks ?? []).slice(0, 3).map((s) => (
                <div key={s.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors">
                  <div>
                    <p className="font-semibold text-surface-900 text-sm">{s.symbol}</p>
                    <p className="text-xs text-surface-400 truncate max-w-[120px]">{s.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-green text-xs">{s.sector}</span>
                    <p className="text-xs text-surface-400 mt-0.5">{s.suggested_percent}% alloc</p>
                  </div>
                </div>
              ))}
              <Link to="/analytics" className="text-xs text-brand-600 hover:underline font-medium block text-center mt-1">
                View full recommendations
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain size={32} className="text-surface-300 mx-auto mb-2" />
              <p className="text-surface-400 text-sm mb-3">No recommendations yet</p>
              <Link to="/analytics" className="btn-secondary text-xs py-1.5 px-3 inline-flex">
                Generate Insights
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
