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
  
  // Prepare data for QuickChart
  const latestValues = new Map();
  (measurements || []).forEach(m => {
    const pName = m.parameters?.display_name || 'Unknown';
    if (!latestValues.has(pName)) {
      latestValues.set(pName, m.value);
    }
  });

  const chartConfig = {
    type: 'bar',
    data: {
      labels: Array.from(latestValues.keys()).slice(0, 7),
      datasets: [{
        label: 'Latest Values',
        data: Array.from(latestValues.values()).slice(0, 7),
        backgroundColor: 'rgba(13, 148, 136, 0.6)',
        borderColor: 'rgb(13, 148, 136)',
        borderWidth: 1
      }]
    },
    options: {
      title: { display: true, text: 'Recent Parameter Readings' },
      legend: { display: false }
    }
  };
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=300`;

  const freqTitle = frequency.charAt(0).toUpperCase() + frequency.slice(1);

  return `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: #0d9488; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">AquaDash ${freqTitle} Report</h1>
        <p style="margin: 5px 0 0;">${plantName} - ${new Date().toLocaleDateString()}</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #0d9488;">Summary</h2>
        <p>Total measurements in last ${daysAgo} day(s): <strong>${count}</strong></p>
        
        <div style="margin: 30px 0; text-align: center;">
          <img src="${chartUrl}" alt="Measurements Chart" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left;">Parameter</th>
              <th style="padding: 10px; text-align: right;">Last Value</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from(latestValues.entries()).slice(0, 10).map(([name, val]) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px;">${name}</td>
                <td style="padding: 10px; text-align: right;">${val}</td>
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
