/**
 * Email service — generates and sends automated reports via MailChannels.
 * MailChannels is a Cloudflare partner that allows sending emails from Workers
 * without an API key or domain verification in many cases.
 */

export async function sendEmailViaResend(env, { to, subject, htmlContent, attachments = [] }) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables');
  }

  const payload = {
    from: 'AquaDash Reports <onboarding@resend.dev>',
    to: [to],
    subject: subject,
    html: htmlContent,
  };

  if (attachments.length > 0) {
    payload.attachments = attachments;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function generateReportHtml(supabase, plantName, frequency = 'daily') {
  let daysAgo = 1;
  if (frequency === 'weekly') daysAgo = 7;
  if (frequency === 'monthly') daysAgo = 30;

  const since = new Date(Date.now() - daysAgo * 86400000).toISOString();
  
  const { data: measurements } = await supabase
    .from('measurements')
    .select('*, parameters(display_name, unit)')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false });

  const count = measurements?.length || 0;
  
  const paramMap = new Map();
  (measurements || []).forEach(m => {
    const pName = m.parameters?.display_name || 'Unknown';
    if (!paramMap.has(pName)) {
      paramMap.set(pName, { value: m.value, unit: m.parameters?.unit, timestamp: m.timestamp });
    }
  });

  const freqTitle = frequency.charAt(0).toUpperCase() + frequency.slice(1);

  return `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: #0d9488; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">AquaDash ${freqTitle} Report</h1>
        <p style="margin: 5px 0 0;">${plantName} - ${new Date().toLocaleDateString()}</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #0d9488;">Summary</h2>
        <p>Period: Last ${daysAgo} day(s)</p>
        <p>Total measurements: <strong>${count}</strong></p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left;">Parameter</th>
              <th style="padding: 10px; text-align: right;">Latest Value</th>
              <th style="padding: 10px; text-align: right;">Unit</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from(paramMap.entries()).slice(0, 10).map(([name, data]) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px;">${name}</td>
                <td style="padding: 10px; text-align: right;">${data.value !== undefined ? Number(data.value).toFixed(2) : '-'}</td>
                <td style="padding: 10px; text-align: right;">${data.unit || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
          A PDF report with detailed data and trend charts is attached to this email.
        </p>
        
        <div style="margin-top: 30px; padding: 15px; background: #f0fdfa; border-radius: 8px; color: #134e4a;">
          <p style="margin: 0;">This is an automated report from your Wastewater Monitoring System.</p>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
        <p>© 2026 Wastewater Monitoring System. All rights reserved.</p>
      </div>
    </div>
  `;
}
