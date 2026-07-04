import { supabase } from '../lib/supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Health & Medical', 'Utilities', 'Education', 'Housing',
  'Travel', 'Personal Care', 'Insurance', 'Groceries', 'Other',
];

export async function scanReceipt(imageBase64, mimeType = 'image/jpeg') {
  if (!GROQ_API_KEY) {
    // Demo mode fallback
    return {
      merchant: 'Demo Store',
      amount: 299,
      date: new Date().toISOString().split('T')[0],
      category: 'Shopping',
      raw_text: 'Demo mode - add VITE_GROQ_API_KEY for real scanning',
      confidence: 0.5,
    };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this receipt image and extract information. Respond ONLY with a JSON object:
{
  "merchant": "store name",
  "amount": numeric_amount_or_null,
  "date": "YYYY-MM-DD or null",
  "category": "one of: ${EXPENSE_CATEGORIES.join(', ')}",
  "raw_text": "full text from receipt",
  "confidence": 0.0_to_1.0
}`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Groq API error response:', errorBody);
      throw new Error(`Groq API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      merchant: extracted.merchant || 'Unknown',
      amount: extracted.amount || null,
      date: extracted.date || null,
      category: EXPENSE_CATEGORIES.includes(extracted.category) ? extracted.category : 'Other',
      raw_text: extracted.raw_text || '',
      confidence: extracted.confidence || 0.7,
    };
  } catch (error) {
    console.error('Receipt scan error:', error);
    throw new Error(error.message || 'Failed to scan receipt');
  }
}

export async function getAIInsights(
  totalIncome,
  totalExpenses,
  categoryStats
) {
  const savingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)
    : '0';

  const topCategories = categoryStats
    .slice(0, 5)
    .map(c => `${c.category}: Rs.${c.amount.toLocaleString('en-IN')} (${c.percentage}%)`)
    .join(', ');

  if (!GROQ_API_KEY) {
    // Demo mode fallback
    const savings = totalIncome - totalExpenses;
    const rate = parseFloat(savingsRate);
    const parts = [];

    if (rate >= 30) {
      parts.push(`Excellent work! Your savings rate of ${savingsRate}% is well above the recommended 20%.`);
    } else if (rate >= 20) {
      parts.push(`Good savings rate of ${savingsRate}%. Consider starting a monthly SIP.`);
    } else if (rate >= 10) {
      parts.push(`Your savings rate of ${savingsRate}% is below the recommended 20%. Try to reduce discretionary spending.`);
    } else {
      parts.push(`Your savings rate of ${savingsRate}% needs improvement. Focus on cutting non-essential expenses.`);
    }

    if (savings > 20000) {
      parts.push(`With Rs.${savings.toLocaleString('en-IN')} saved this month, consider investing in a mutual fund SIP for long-term wealth creation.`);
    }

    if (topCategories) {
      parts.push(`Top spending categories: ${topCategories}. Review each for potential savings.`);
    }

    return parts.join('\n\n');
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: `You are a personal finance advisor for an Indian user. Analyze this data and provide 3-4 actionable insights:

Income: Rs.${totalIncome.toLocaleString('en-IN')}
Expenses: Rs.${totalExpenses.toLocaleString('en-IN')}
Savings: Rs.${(totalIncome - totalExpenses).toLocaleString('en-IN')}
Savings Rate: ${savingsRate}%
Top Spending Categories: ${topCategories || 'No data yet'}

Provide practical advice for Indian context (mention SIPs, PPF, FD as appropriate). Keep under 200 words.`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Groq API error response:', errorBody);
      throw new Error(`Groq API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Unable to generate insights.';
  } catch (error) {
    console.error('AI insights error:', error);
    throw new Error('Failed to generate insights');
  }
}

export async function getRecentScans() {
  const { data, error } = await supabase
    .from('receipt_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function generateStockRecommendationsFromGroq(
  totalIncome,
  totalExpenses,
  totalSavings,
  topCategories,
  riskProfile = 'moderate'
) {
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
          model: 'llama-3.1-8b-instant',
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
        { symbol: 'IRCTC', name: 'IRCTC Ltd', sector: 'Travel', reason: 'Monopoly business', suggested_percent: 20 },
      ];
      mutualFunds = [
        { name: 'SBI Liquid Fund', type: 'Liquid', reason: 'Safe emergency fund parking', suggested_percent: 40 },
        { name: 'HDFC Balanced Advantage Fund', type: 'Hybrid', reason: 'Dynamic allocation reduces risk', suggested_percent: 60 },
      ];
      recommendationText = `With a conservative profile and ${savingsRate}% savings rate, focus on capital preservation. Build a 6-month emergency fund before equity investments.`;
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
      recommendationText = `Your ${savingsRate}% savings rate allows aggressive investing. Allocate 70-80% to equities. Small/mid-caps need 7+ year commitment.`;
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
      recommendationText = `With ${savingsRate}% savings and moderate risk, a balanced equity-debt approach works best. Start SIPs in large-cap and flexi-cap funds.`;
    }
  }

  return {
    recommendation_text: recommendationText,
    stocks,
    mutual_funds: mutualFunds,
  };
}

export async function saveReceiptScan(scan) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('receipt_scans')
    .insert({ ...scan, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
