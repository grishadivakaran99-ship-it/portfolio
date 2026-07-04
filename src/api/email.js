const RESEND_FROM = 'FinTrack India <onboarding@resend.dev>';

// In dev:  /api/resend/emails → Vite proxy → https://api.resend.com/emails
// In prod: /api/resend/emails → Vercel serverless → https://api.resend.com/emails
const RESEND_URL = '/api/resend/emails';

let rateLimitStore = {};

export async function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitStore[identifier]) {
    rateLimitStore[identifier] = [];
  }

  rateLimitStore[identifier] = rateLimitStore[identifier].filter(
    (timestamp) => timestamp > windowStart
  );

  if (rateLimitStore[identifier].length >= maxRequests) {
    const oldestRequest = rateLimitStore[identifier][0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

    return {
      success: false,
      remaining: 0,
      retryAfter,
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    };
  }

  rateLimitStore[identifier].push(now);

  return {
    success: true,
    remaining: maxRequests - rateLimitStore[identifier].length,
    retryAfter: 0,
    message: 'Request allowed',
  };
}

export async function checkArcjetRateLimit(identifier, config = { max: 5, window: '1m' }) {
  const windowMs = config.window === '1m' ? 60000 : 60000;
  const maxRequests = config.max || 5;

  const now = Date.now();
  const windowStart = now - windowMs;

  const arcjetKey = `arcjet-${identifier}`;

  if (!rateLimitStore[arcjetKey]) {
    rateLimitStore[arcjetKey] = [];
  }

  rateLimitStore[arcjetKey] = rateLimitStore[arcjetKey].filter(
    (timestamp) => timestamp > windowStart
  );

  const currentCount = rateLimitStore[arcjetKey].length;

  if (currentCount >= maxRequests) {
    const oldestRequest = rateLimitStore[arcjetKey][0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      reset: new Date(oldestRequest + windowMs),
      retryAfter,
      reason: 'RATE_LIMITED',
      message: `Arcjet: Rate limit exceeded. Blocked until ${new Date(oldestRequest + windowMs).toLocaleTimeString()}.`,
    };
  }

  rateLimitStore[arcjetKey].push(now);

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    reset: new Date(now + windowMs),
    retryAfter: 0,
    reason: 'OK',
    message: 'Request allowed by Arcjet',
  };
}

async function postEmail(payload) {
  console.log(payload)
  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function sendTestEmail(userEmail, userName) {
  try {
    const data = await postEmail({
      from: RESEND_FROM,
      to: ['grishadivakaran99@gmail.com'],
      subject: 'Test Email from FinTrack India',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0;">FinTrack India</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">Test Email</p>
          </div>
          <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px;">Hi ${userName || 'there'},</p>
            <p style="color: #475569; font-size: 15px;">
              This is a test email from FinTrack India. Your email integration is working correctly!
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `,
    });

    return { success: true, id: data.id, message: 'Test email sent!' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function sendBudgetAlertEmail(userEmail, userName, budgetData) {
  try {
    const { category, percentage, spent, limit } = budgetData;
    const isOverBudget = percentage >= 100;

    const data = await postEmail({
      from: RESEND_FROM,
      to: ['grishadivakaran99@gmail.com'],
      subject: isOverBudget
        ? `ALERT: ${category} Budget Exceeded!`
        : `Warning: ${category} Budget at ${percentage}%`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">FinTrack India</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">Budget Alert Notification</p>
          </div>
          <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #334155; font-size: 16px;">Hi ${userName || 'there'},</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              ${isOverBudget
                ? `Your <strong>${category}</strong> budget has been exceeded! You've spent <strong style="color: #dc2626;">Rs.${spent.toLocaleString('en-IN')}</strong> against your limit of Rs.${limit.toLocaleString('en-IN')}.`
                : `Your <strong>${category}</strong> budget is at <strong style="color: #f59e0b;">${percentage}%</strong> (Rs.${spent.toLocaleString('en-IN')} of Rs.${limit.toLocaleString('en-IN')}).`
              }
            </p>
            <div style="margin: 24px 0; background: ${isOverBudget ? '#fef2f2' : '#fffbeb'}; padding: 16px; border-radius: 8px; border-left: 4px solid ${isOverBudget ? '#dc2626' : '#f59e0b'};">
              <p style="margin: 0; color: ${isOverBudget ? '#991b1b' : '#92400e'}; font-weight: 600;">
                ${isOverBudget ? 'Budget Exceeded' : 'Approaching Budget Limit'}
              </p>
              <p style="margin: 8px 0 0; color: ${isOverBudget ? '#b91c1c' : '#b45309'};">
                ${isOverBudget
                  ? 'Consider reviewing your spending in this category.'
                  : 'You might want to slow down spending in this category.'
                }
              </p>
            </div>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            You received this email because you enabled budget alerts in FinTrack India.
          </p>
        </div>
      `,
    });

    return { success: true, id: data.id, message: 'Budget alert sent!' };
  } catch (error) {
    console.error('Budget alert email error:', error);
    return { success: false, message: error.message };
  }
}