import { supabase } from '../lib/supabase';
import { sendBudgetAlertEmail } from './email';

export async function getTransactions(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function getTransactionsByMonth(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction(input) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  console.log(user)
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;

  // Check budget thresholds for expense transactions and create notifications
  if (input.type == 'expense') {
    console.log("this is working or not")
    checkAndNotifyBudget(user.id, input.category, input.date).catch(console.error);
  }

  return data;
}

export async function checkAndNotifyBudget(userId, category, dateStr) {
  try {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const { data: budget } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    console.log('[BudgetCheck] budget found:', budget); // ← add this

    if (!budget) {
      console.log('[BudgetCheck] No budget found for', category, month, year); // ← add this
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: txns } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('category', category)
      .gte('date', startDate)
      .lte('date', endDate);

    const spent = (txns || []).reduce((s, t) => s + Number(t.amount), 0);
    const pct = (spent / Number(budget.monthly_limit)) * 100;

    console.log(`[BudgetCheck] ${category}: spent=${spent}, limit=${budget.monthly_limit}, pct=${pct.toFixed(1)}%`); // ← add this
    console.log(`[BudgetCheck] flags: alert_80_sent=${budget.alert_80_sent}, alert_100_sent=${budget.alert_100_sent}`); // ← add this

    const thresholds = [
      { pct: 80, sent: budget.alert_80_sent, type: 'budget_80', title: `Budget Alert: ${category} at 80%` },
      { pct: 100, sent: budget.alert_100_sent, type: 'budget_100', title: `Budget Exceeded: ${category}` },
    ];

    for (const threshold of thresholds) {
      console.log(`[BudgetCheck] Checking ${threshold.pct}% threshold: pct>=${threshold.pct}? ${pct >= threshold.pct} | already sent? ${threshold.sent}`); // ← add this
      if (!threshold.sent && pct >= threshold.pct) {
        console.log(`[BudgetCheck] 🔥 Sending email for ${threshold.pct}% threshold`); // ← add this
        await sendBudgetAlertEmail(user.email, profile?.full_name, {
          category,
          percentage: Math.round(pct),
          spent,
          limit: Number(budget.monthly_limit),
        });
        // ... rest unchanged
      }
    }
  } catch (e) {
    console.error('[BudgetCheck] ERROR:', e); // ← make this more visible
  }
}
export async function updateTransaction(id, input) {
  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getTransactionsStats(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, category')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};

  for (const t of data || []) {
    if (t.type === 'income') {
      totalIncome += Number(t.amount);
    } else {
      totalExpenses += Number(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    }
  }

  return { totalIncome, totalExpenses, categoryTotals };
}
