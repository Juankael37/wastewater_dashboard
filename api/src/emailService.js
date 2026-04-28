/**
 * Email service — generates and sends automated reports via MailChannels.
 * MailChannels is a Cloudflare partner that allows sending emails from Workers
 * without an API key or domain verification in many cases.
 */

export async function sendEmailViaResend(env, { to, subject, htmlContent }) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AquaDash Reports <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export async function generateDailyReportHtml(supabase, plantName) {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  
  const { data: measurements } = await supabase
    .from('measurements')
    .select('*, parameters(display_name, unit)')
    .gte('timestamp', yesterday)
    .order('timestamp', { ascending: false });

  const count = measurements?.length || 0;
  
  return `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: #0d9488; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">AquaDash Daily Report</h1>
        <p style="margin: 5px 0 0;">${plantName} - ${new Date().toLocaleDateString()}</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #0d9488;">Summary</h2>
        <p>Total measurements in last 24 hours: <strong>${count}</strong></p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left;">Parameter</th>
              <th style="padding: 10px; text-align: right;">Last Value</th>
            </tr>
          </thead>
          <tbody>
            ${(measurements || []).slice(0, 10).map(m => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px;">${m.parameters?.display_name || 'Unknown'}</td>
                <td style="padding: 10px; text-align: right;">${m.value} ${m.parameters?.unit || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
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
