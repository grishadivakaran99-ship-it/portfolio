import { supabase } from '../lib/supabase';
import { getLast6Months } from '../lib/utils';

export async function getDashboardStats(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const t of (data ?? [])) {
    if (t.type === 'income') totalIncome += Number(t.amount);
    else totalExpenses += Number(t.amount);
  }

  const { data: budgets, error: bErr } = await supabase
    .from('budgets')
    .select('monthly_limit')
    .eq('month', month)
    .eq('year', year);
  if (bErr) throw bErr;

  const totalBudget = (budgets ?? []).reduce((s, b) => s + Number(b.monthly_limit), 0);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

  return {
    totalIncome,
    totalExpenses,
    totalSavings: totalIncome - totalExpenses,
    budgetUtilization,
  };
}

export async function getCategoryStats(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;

  const catMap = {};
  for (const t of (data ?? [])) {
    if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 };
    catMap[t.category].amount += Number(t.amount);
    catMap[t.category].count += 1;
  }

  const total = Object.values(catMap).reduce((s, v) => s + v.amount, 0);
  return Object.entries(catMap)
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getMonthlyTrends() {
  const months = getLast6Months();
  const trends = [];

  for (const { month, year, label } of months) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;

    let income = 0, expenses = 0;
    for (const t of (data ?? [])) {
      if (t.type === 'income') income += Number(t.amount);
      else expenses += Number(t.amount);
    }
    trends.push({ month: label, income, expenses, savings: income - expenses });
  }
  return trends;
}
