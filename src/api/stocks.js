import { supabase } from '../lib/supabase';
import { getCurrentMonth, getCurrentYear } from '../lib/utils';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export async function getStockRecommendations() {
  const month = getCurrentMonth();
  const year = getCurrentYear();
  const { data, error } = await supabase
    .from('stock_recommendations')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function generateStockRecommendations(
  totalIncome,
  totalExpenses,
  totalSavings,
  topCategories,
  riskProfile = 'moderate'
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const month = getCurrentMonth();
  const year = getCurrentYear();
  const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : '0';

  let stocks = [];
  let mutualFunds = [];
  let recommendationText = '';

  if (GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: `You are an Indian investment advisor. Based on this user's finances, provide stock and mutual fund recommendations. Respond ONLY with valid JSON:

Income: Rs.${totalIncome.toLocaleString('en-IN')}/month
Expenses: Rs.${totalExpenses.toLocaleString('en-IN')}/month
Savings: Rs.${totalSavings.toLocaleString('en-IN')}/month
Savings Rate: ${savingsRate}%
Risk Profile: ${riskProfile}
Top Spending: ${topCategories.join(', ')}

{
  "recommendation_text": "2-3 sentence advice",
  "stocks": [
    {"symbol": "NSE_SYMBOL", "name": "Company", "sector": "Sector", "reason": "Why", "suggested_percent": 20}
  ],
  "mutual_funds": [
    {"name": "Fund Name", "type": "Large Cap", "reason": "Why", "suggested_percent": 30}
  ]
}

Provide 3-5 stocks and 2-3 mutual funds for ${riskProfile} profile. Use real NSE symbols.`,
            },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          recommendationText = parsed.recommendation_text || '';
          stocks = parsed.stocks || [];
          mutualFunds = parsed.mutual_funds || [];
        }
      }
    } catch (e) {
      console.error('Groq stock API error:', e);
    }
  }

  // Fallback static recommendations
  if (!stocks.length) {
    if (riskProfile === 'conservative') {
      stocks = [
        { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', reason: 'Stable large-cap with consistent dividends', suggested_percent: 30 },
        { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'FMCG', reason: 'Defensive FMCG with pricing power', suggested_percent: 25 },
        { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer', reason: 'Premium brand with strong moat', suggested_percent: 25 },
        { symbol: 'IRCTC', name: 'IRCTC Ltd', sector: 'Travel', reason: 'Monopoly business with predictable cash flows', suggested_percent: 20 },
      ];
      mutualFunds = [
        { name: 'SBI Liquid Fund', type: 'Liquid', reason: 'Safe emergency fund parking', suggested_percent: 40 },
        { name: 'HDFC Balanced Advantage Fund', type: 'Hybrid', reason: 'Dynamic allocation reduces risk', suggested_percent: 60 },
      ];
      recommendationText = `With a conservative profile and ${savingsRate}% savings rate, focus on capital preservation. Build a 6-month emergency fund before equity investments. Consider balanced hybrid funds for steady returns.`;
    } else if (riskProfile === 'aggressive') {
      stocks = [
        { symbol: 'ZOMATO', name: 'Zomato Ltd', sector: 'Tech', reason: 'High-growth food-tech', suggested_percent: 20 },
        { symbol: 'TATAPOWER', name: 'Tata Power', sector: 'Energy', reason: 'Clean energy transition play', suggested_percent: 25 },
        { symbol: 'ADANIGREEN', name: 'Adani Green Energy', sector: 'Renewable', reason: 'Largest renewable company', suggested_percent: 20 },
        { symbol: 'IRFC', name: 'IRFC Ltd', sector: 'Finance', reason: 'Govt-backed infra financier', suggested_percent: 20 },
        { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'NBFC', reason: 'Premier consumer lending', suggested_percent: 15 },
      ];
      mutualFunds = [
        { name: 'Nippon India Small Cap Fund', type: 'Small Cap', reason: 'High return potential over 7+ years', suggested_percent: 35 },
        { name: 'Mirae Asset Emerging Bluechip', type: 'Mid Cap', reason: 'Consistent mid-cap outperformer', suggested_percent: 35 },
        { name: 'Parag Parikh Flexi Cap Fund', type: 'Flexi Cap', reason: 'Global diversification', suggested_percent: 30 },
      ];
      recommendationText = `Your ${savingsRate}% savings rate allows aggressive investing. Allocate 70-80% to equities. Small/mid-caps offer high growth but need 7+ year commitment. Don't neglect emergency fund first.`;
    } else {
      stocks = [
        { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Conglomerate', reason: 'Diversified revenue streams', suggested_percent: 25 },
        { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', reason: 'Global IT leader with strong growth', suggested_percent: 25 },
        { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', reason: 'Best retail banking franchise', suggested_percent: 20 },
        { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer', reason: 'Market leader with pricing power', suggested_percent: 15 },
        { symbol: 'TCS', name: 'TCS Ltd', sector: 'IT', reason: 'Consistent dividend payer', suggested_percent: 15 },
      ];
      mutualFunds = [
        { name: 'Axis Bluechip Fund', type: 'Large Cap', reason: 'Quality large-cap with lower volatility', suggested_percent: 35 },
        { name: 'Mirae Asset Flexi Cap Fund', type: 'Flexi Cap', reason: 'Flexible allocation across market caps', suggested_percent: 35 },
        { name: 'ICICI Pru Equity & Debt Fund', type: 'Hybrid', reason: 'Balanced risk-reward', suggested_percent: 30 },
      ];
      recommendationText = `With ${savingsRate}% savings and moderate risk, a balanced equity-debt approach works best. Start SIPs in large-cap and flexi-cap funds. Ensure adequate term and health insurance.`;
    }
  }

  // Save to database
  const existing = await getStockRecommendations();
  if (existing) {
    const { data, error } = await supabase
      .from('stock_recommendations')
      .update({
        recommendation_text: recommendationText,
        stocks: stocks,
        mutual_funds: mutualFunds,
        risk_profile: riskProfile,
        generated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('stock_recommendations')
    .insert({
      user_id: user.id,
      recommendation_text: recommendationText,
      stocks: stocks,
      mutual_funds: mutualFunds,
      risk_profile: riskProfile,
      month,
      year,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
