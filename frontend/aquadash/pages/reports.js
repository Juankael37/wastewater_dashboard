/**
 * AquaDash Reports Page
 * Display reports and export functionality
 */

async function loadReports() {
  const content = document.getElementById('reports-content');
  setLoading('reports-content');

  try {
    const [summary, performance, daily] = await Promise.all([
      api.getReportSummary(),
      api.getReportPerformance(),
      api.getDailyReport()
    ]);

    let html = '';

    // Export Controls
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
    html += '<h3 class="text-lg font-semibold mb-4">Export Data</h3>';
    html += '<div class="flex flex-wrap gap-3">';
    html += '<button onclick="exportPdf()" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">PDF Report</button>';
    html += '<button onclick="exportCsv()" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">CSV Export</button>';
    html += '</div>';
    html += '</div>';

    // Summary Report
    if (summary) {
      html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Summary Report</h3>';
      html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
      
      html += createReportMetric('Total Records', summary.total_records || 0);
      html += createReportMetric('Compliance Rate', formatPercent(summary.compliance_rate || 0));
      html += createReportMetric('Avg Parameters', formatNumber(summary.avg_parameters || 0, 1));
      
      html += '</div>';
      html += '</div>';
    }

    // Performance Report
    if (performance && performance.data) {
      html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Performance Metrics</h3>';
      
      const rows = performance.data.map(p => [
        p.parameter || 'Unknown',
        formatNumber(p.avg_value || 0, 2),
        formatNumber(p.min_value || 0, 2),
        formatNumber(p.max_value || 0, 2),
        formatNumber(p.compliance_rate || 0, 1) + '%'
      ]);
      
      html += createTable(['Parameter', 'Average', 'Min', 'Max', 'Compliance'], rows);
      html += '</div>';
    }

    // Daily Report
    if (daily && daily.data && daily.data.length > 0) {
      html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
      html += '<h3 class="text-lg font-semibold mb-4">Daily Readings</h3>';
      
      const rows = daily.data.map(d => [
        formatDate(d.date),
        d.record_count || 0,
        formatPercent(d.compliance_rate || 0),
        d.alerts_triggered || 0
      ]);
      
      html += createTable(['Date', 'Records', 'Compliance', 'Alerts'], rows);
      html += '</div>';
    }

    content.innerHTML = html;
    initIcons();

  } catch (error) {
    setError('reports-content', `Error loading reports: ${error.message}`);
  }
}

function createReportMetric(label, value) {
  return `
    <div class="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900 dark:to-teal-800 p-4 rounded-lg">
      <p class="text-gray-600 dark:text-gray-300 text-sm">${label}</p>
      <p class="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-2">${value}</p>
    </div>
  `;
}

async function exportPdf() {
  try {
    showNotification('success', 'Generating PDF...');
    const blob = await api.getPdfReport();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wastewater-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('success', 'PDF downloaded successfully');
  } catch (error) {
    showNotification('error', `Failed to generate PDF: ${error.message}`);
  }
}

async function exportCsv() {
  try {
    showNotification('success', 'Exporting CSV...');
    const response = await api.exportCsv();
    const text = await response.text();
    
    const blob = new Blob([text], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wastewater-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('success', 'CSV exported successfully');
  } catch (error) {
    showNotification('error', `Failed to export CSV: ${error.message}`);
  }
}
