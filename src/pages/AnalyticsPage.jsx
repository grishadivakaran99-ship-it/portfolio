import React, { useState } from 'react';
import {
  TrendingUp, Brain, RefreshCw, Loader2
} from 'lucide-react';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { formatCurrency, getCurrentMonth, getCurrentYear, getMonthName } from '../lib/utils';
import { useData } from '../context/DataContext';
import { getAIInsights, generateStockRecommendationsFromGroq } from '../api/ai';
import { CATEGORY_COLORS } from '../types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

export default function AnalyticsPage() {
  const { toasts, addToast, removeToast } = useToast();
  const month = getCurrentMonth();
  const year = getCurrentYear();

  const {
    dashboardStats,
    categoryStats,
    monthlyTrends,
    stockRecommendation,
    loading,
    refreshAll,
  } = useData();

  const [insights, setInsights] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [riskProfile, setRiskProfile] = useState('moderate');
  const [localStockRec, setLocalStockRec] = useState(null);

  if (loading) return <PageLoader text="Loading analytics..." />;

  const savingsRate = dashboardStats.totalIncome > 0
    ? Math.round((dashboardStats.totalSavings / dashboardStats.totalIncome) * 100)
    : 0;

  const top5 = categoryStats.slice(0, 5);
  const currentStocks = localStockRec || stockRecommendation;

  async function handleGenerateInsights() {
    setInsightsLoading(true);
    try {
      const text = await getAIInsights(
        dashboardStats.totalIncome,
        dashboardStats.totalExpenses,
        categoryStats.slice(0, 5)
      );
      setInsights(text);
    } catch (e) {
      addToast(e.message ?? 'Failed to generate insights', 'error');
    } finally {
      setInsightsLoading(false);
    }
  }

  async function handleGenerateStocks() {
    setStocksLoading(true);
    try {
      const topCats = categoryStats.slice(0, 3).map((c) => c.category);
      const result = await generateStockRecommendationsFromGroq(
        dashboardStats.totalIncome,
        dashboardStats.totalExpenses,
        dashboardStats.totalSavings,
        topCats,
        riskProfile
      );
      setLocalStockRec(result);
      addToast('Stock recommendations generated!', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setStocksLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-surface-500 text-sm mt-0.5">{getMonthName(month, year)} Financial Analysis</p>
        </div>
        <button onClick={refreshAll} className="btn-secondary p-2.5"><RefreshCw size={16} /></button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Income', value: formatCurrency(dashboardStats.totalIncome), color: 'text-success-600' },
          { label: 'Total Expenses', value: formatCurrency(dashboardStats.totalExpenses), color: 'text-danger-600' },
          { label: 'Net Savings', value: formatCurrency(dashboardStats.totalSavings), color: 'text-brand-600' },
          { label: 'Savings Rate', value: `${savingsRate}%`, color: savingsRate >= 20 ? 'text-success-600' : 'text-warning-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-3 px-4">
            <p className="text-xs text-surface-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Category Pie */}
        <div className="card">
          <h2 className="section-title">Category Breakdown</h2>
          {categoryStats.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-surface-400 text-sm">
              No expense data for this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={top5}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="amount"
                  nameKey="category"
                >
                  {top5.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatCurrency(v), 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Income vs Expense Bar */}
        <div className="card">
          <h2 className="section-title">Income vs Expenses (6 Months)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrends} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `Rs.${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(v)]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Spenders & Savings Trend */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title">Most Spent Categories</h2>
          <div className="space-y-3">
            {top5.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-6">No data yet</p>
            ) : top5.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[c.category] ?? '#94a3b8' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="font-medium text-surface-800 truncate">{c.category}</span>
                    <span className="text-surface-600 flex-shrink-0 ml-2">{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[c.category] ?? '#94a3b8',
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-surface-400 flex-shrink-0 w-8 text-right">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Savings Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrends} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                formatter={(v) => [formatCurrency(v), 'Savings']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorSavings)"
                name="Savings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-brand-600" />
            <h2 className="section-title mb-0">AI Financial Insights</h2>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={insightsLoading}
            className="btn-primary py-1.5 px-4 text-sm"
          >
            {insightsLoading ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : 'Generate Insights'}
          </button>
        </div>
        {insights ? (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
            <p className="text-brand-900 text-sm leading-relaxed whitespace-pre-wrap">{insights}</p>
          </div>
        ) : (
          <div className="bg-surface-50 rounded-xl p-6 text-center">
            <Brain size={32} className="text-surface-300 mx-auto mb-2" />
            <p className="text-surface-500 text-sm">
              Click "Generate Insights" to get AI-powered analysis of your spending patterns.
            </p>
          </div>
        )}
      </div>

      {/* Stock Recommendations */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-success-600" />
            <h2 className="section-title mb-0">Stock & MF Recommendations</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value)}
              className="input-field py-1.5 text-sm w-auto"
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <button
              onClick={handleGenerateStocks}
              disabled={stocksLoading}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              {stocksLoading ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : 'Generate Picks'}
            </button>
          </div>
        </div>

        {currentStocks ? (
          <div className="space-y-4">
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-surface-700 text-sm leading-relaxed">{currentStocks.recommendation_text}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Stocks</h3>
                <div className="space-y-2">
                  {(currentStocks.stocks ?? []).map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-surface-900 text-sm">{s.symbol}</p>
                        <p className="text-xs text-surface-400">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="badge bg-success-100 text-success-700 text-xs">{s.sector}</span>
                        <p className="text-xs text-surface-500 mt-0.5">{s.suggested_percent}% allocation</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Mutual Funds</h3>
                <div className="space-y-2">
                  {(currentStocks.mutual_funds ?? []).map((f) => (
                    <div key={f.name} className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-surface-900 text-sm">{f.name}</p>
                        <p className="text-xs text-surface-400">{f.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className="badge bg-brand-100 text-brand-700 text-xs">{f.type}</span>
                        <p className="text-xs text-surface-500 mt-0.5">{f.suggested_percent}% allocation</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-surface-400 text-center mt-2 italic">
              * AI-generated suggestions for educational purposes only. Not financial advice.
            </p>
          </div>
        ) : (
          <div className="bg-surface-50 rounded-xl p-6 text-center">
            <TrendingUp size={32} className="text-surface-300 mx-auto mb-2" />
            <p className="text-surface-500 text-sm">
              Select a risk profile and generate personalized stock and mutual fund recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
