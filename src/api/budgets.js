import { supabase } from '../lib/supabase';
import { sendBudgetAlertEmail } from './email';

export async function getBudgets(month, year) {
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('category');
  if (budgetsError) throw budgetsError;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: txns, error: txnsError } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);
  if (txnsError) throw txnsError;

  const spentByCategory = {};
  for (const txn of (txns ?? [])) {
    spentByCategory[txn.category] = (spentByCategory[txn.category] ?? 0) + Number(txn.amount);
  }

  return (budgets ?? []).map((b) => {
    const spent = spentByCategory[b.category] ?? 0;
    const percentage = Math.round((spent / Number(b.monthly_limit)) * 100);
    return { ...b, spent, percentage };
  });
}

async function checkAndSendBudgetAlert(budget, userEmail, userName) {
  const { category, monthly_limit, spent, percentage, alert_80_sent, alert_100_sent } = budget;

  console.log(`[BudgetAlert] ${category}: ${percentage}% | 80sent=${alert_80_sent} | 100sent=${alert_100_sent} | email=${userEmail}`);

  if (percentage >= 100 && !alert_100_sent) {
    console.log(`[BudgetAlert] Sending 100% alert for ${category}`);
    await sendBudgetAlertEmail(userEmail, userName, {
      category, percentage, spent, limit: Number(monthly_limit),
    });
    const { error } = await supabase
      .from('budgets')
      .update({ alert_100_sent: true })
      .eq('id', budget.id);
    if (!error) budget.alert_100_sent = true;

  } else if (percentage >= 80 && !alert_80_sent) {
    console.log(`[BudgetAlert] Sending 80% alert for ${category}`);
    await sendBudgetAlertEmail(userEmail, userName, {
      category, percentage, spent, limit: Number(monthly_limit),
    });
    const { error } = await supabase
      .from('budgets')
      .update({ alert_80_sent: true })
      .eq('id', budget.id);
    if (!error) budget.alert_80_sent = true;

  } else {
    console.log(`[BudgetAlert] No alert needed or already sent`);
  }
}


export async function createBudget(input) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;

  const budgetWithSpent = {
    ...data,
    spent: 0,
    percentage: 0,
  };

  await checkAndSendBudgetAlert(budgetWithSpent, user.email, profile?.full_name);

  return budgetWithSpent;
}

export async function updateBudget(id, input) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // Reset alert flags when limit changes so alerts re-fire
  const { data, error } = await supabase
    .from('budgets')
    .update({ ...input, alert_80_sent: false, alert_100_sent: false })  // ← reset here
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  const startDate = `${data.year}-${String(data.month).padStart(2, '0')}-01`;
  const endDate = new Date(data.year, data.month, 0).toISOString().split('T')[0];

  const { data: txns } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('type', 'expense')
    .eq('category', data.category)
    .gte('date', startDate)
    .lte('date', endDate);

  const spent = (txns ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  const percentage = Math.round((spent / Number(data.monthly_limit)) * 100);

  const budgetWithSpent = { ...data, spent, percentage };

  await checkAndSendBudgetAlert(budgetWithSpent, user.email, profile?.full_name);

  return budgetWithSpent;
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export async function checkBudgetAlertsAfterTransaction(user, category, month, year) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data: budget } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('category', category)
    .eq('month', month)
    .eq('year', year)
    .single();

  if (!budget) return;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: txns } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('category', category)
    .gte('date', startDate)
    .lte('date', endDate);

  const spent = (txns ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  const percentage = Math.round((spent / Number(budget.monthly_limit)) * 100);

  const budgetWithSpent = { ...budget, spent, percentage };

  await checkAndSendBudgetAlert(budgetWithSpent, user.email, profile?.full_name);
}
