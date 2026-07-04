import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentMonth, getCurrentYear } from '../lib/utils';
import {checkAndNotifyBudget} from '../api/transactions'
const DataContext = createContext(undefined);

export function DataProvider({ children }) {
  const month = getCurrentMonth();
  const year = getCurrentYear();

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stockRecommendation, setStockRecommendation] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    budgetUtilization: 0,
  });
  const [categoryStats, setCategoryStats] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get month data helper
  const getMonthRange = (m, y) => {
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  };

  // Fetch all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshTransactions(),
        refreshBudgets(),
        refreshDashboard(),
      ]);
    } catch (e) {
      console.error('Error refreshing data:', e);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const refreshTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    setTransactions(data);
  }, []);

  const refreshBudgets = useCallback(async () => {
    // Fetch budgets
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('category');
    if (budgetError) throw budgetError;

    // Calculate spending per category
    const { startDate, endDate } = getMonthRange(month, year);
    const { data: txns, error: txnError } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate);
    if (txnError) throw txnError;

    const spentByCategory = {};
    for (const t of txns || []) {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + Number(t.amount);
    }

    // Combine budget with spent
    const budgetsWithSpent = (budgetData || []).map((b) => {
      const spent = spentByCategory[b.category] || 0;
      const percentage = Math.round((spent / Number(b.monthly_limit)) * 100);
      return { ...b, spent, percentage };
    });

    setBudgets(budgetsWithSpent);
  }, [month, year]);

  const refreshDashboard = useCallback(async () => {
    const { startDate, endDate } = getMonthRange(month, year);

    // Dashboard stats
    const { data: monthTxns, error: monthErr } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', startDate)
      .lte('date', endDate);
    if (monthErr) throw monthErr;

    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of monthTxns || []) {
      if (t.type === 'income') totalIncome += Number(t.amount);
      else totalExpenses += Number(t.amount);
    }

    // Total budget for utilization
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('monthly_limit')
      .eq('month', month)
      .eq('year', year);
    const totalBudget = (budgetData || []).reduce((s, b) => s + Number(b.monthly_limit), 0);
    const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

    setDashboardStats({
      totalIncome,
      totalExpenses,
      totalSavings: totalIncome - totalExpenses,
      budgetUtilization,
    });

    // Category stats
    const { data: catTxns } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate);

    const catMap = {};
    for (const t of catTxns || []) {
      if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 };
      catMap[t.category].amount += Number(t.amount);
      catMap[t.category].count += 1;
    }

    const total = Object.values(catMap).reduce((s, v) => s + v.amount, 0);
    const catStats = Object.entries(catMap)
      .map(([category, { amount, count }]) => ({
        category,
        amount,
        count,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    setCategoryStats(catStats);

    // Monthly trends (last 6 months)
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const { startDate: sd, endDate: ed } = getMonthRange(m, y);

      const { data: trendTxns } = await supabase
        .from('transactions')
        .select('type, amount')
        .gte('date', sd)
        .lte('date', ed);

      let inc = 0, exp = 0;
      for (const t of trendTxns || []) {
        if (t.type === 'income') inc += Number(t.amount);
        else exp += Number(t.amount);
      }

      trends.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        income: inc,
        expenses: exp,
        savings: inc - exp,
      });
    }
    setMonthlyTrends(trends);

    // Stock recommendation
    const { data: stockData } = await supabase
      .from('stock_recommendations')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setStockRecommendation(stockData);

    // Notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(notifData);
  }, [month, year]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Real-time subscription for transactions
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          refreshTransactions();
          refreshDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTransactions, refreshDashboard]);

  // Real-time subscription for budgets
  useEffect(() => {
    const channel = supabase
      .channel('budgets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets' },
        () => {
          refreshBudgets();
          refreshDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBudgets, refreshDashboard]);

  // Transaction CRUD
  const addTransaction = useCallback(async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
 console.log(user)
    const { data: txn, error } = await supabase
      .from('transactions')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error) throw error;


  // Check budget thresholds for expense transactions and create notifications
  if (data.type == 'expense') {
    console.log("this is working or not")
    checkAndNotifyBudget(user.id, data.category, data.date).catch(console.error);
  }

    // Refresh will happen via realtime subscription, but also do it immediately
    await Promise.all([refreshTransactions(), refreshDashboard()]);
    return txn;
  }, [refreshTransactions, refreshDashboard]);

  

  const updateTransaction = useCallback(async (id, data) => {
    const { data: txn, error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await Promise.all([refreshTransactions(), refreshDashboard()]);
    return txn;
  }, [refreshTransactions, refreshDashboard]);

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await Promise.all([refreshTransactions(), refreshDashboard()]);
  }, [refreshTransactions, refreshDashboard]);

  // Budget CRUD
  const addBudget = useCallback(async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: budget, error } = await supabase
      .from('budgets')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error) throw error;

    await Promise.all([refreshBudgets(), refreshDashboard()]);
    return budget;
  }, [refreshBudgets, refreshDashboard]);

  const updateBudget = useCallback(async (id, data) => {
    const { data: budget, error } = await supabase
      .from('budgets')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await Promise.all([refreshBudgets(), refreshDashboard()]);
    return budget;
  }, [refreshBudgets, refreshDashboard]);

  const deleteBudget = useCallback(async (id) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await Promise.all([refreshBudgets(), refreshDashboard()]);
  }, [refreshBudgets, refreshDashboard]);

  // Notification
  const markNotificationRead = useCallback(async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data);
  }, []);

  return (
    <DataContext.Provider
      value={{
        transactions,
        budgets,
        notifications,
        stockRecommendation,
        dashboardStats,
        categoryStats,
        monthlyTrends,
        loading,
        refreshAll,
        refreshTransactions,
        refreshBudgets,
        refreshDashboard,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBudget,
        updateBudget,
        deleteBudget,
        markNotificationRead,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
