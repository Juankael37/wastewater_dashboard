/**
 * AquaDash Dashboard Page
 * Displays overview and key metrics
 */

let dashboardCharts = {};

async function loadDashboard() {
  const content = document.getElementById('dashboard-content');
  setLoading('dashboard-content');

  try {
    const [measurements, alerts, report] = await Promise.all([
      api.getRecentMeasurements(100),
      api.getAlertsDashboard(),
      api.getReportSummary()
    ]);

    let html = '';

    // KPI Cards
    html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">';
    
    html += createKpiCard(
      'Total Records',
      report?.total_records || 0,
      'layout-list',
      'bg-blue-100 dark:bg-blue-900'
    );
    
    html += createKpiCard(
      'Compliance Rate',
      formatPercent(report?.compliance_rate || 0),
      'check-circle',
      'bg-green-100 dark:bg-green-900'
    );
    
    html += createKpiCard(
      'Active Alerts',
      alerts?.active_count || 0,
      'alert-triangle',
      'bg-red-100 dark:bg-red-900'
    );
    
    html += createKpiCard(
      'Parameters Tracked',
      report?.parameters_count || 0,
      'activity',
      'bg-purple-100 dark:bg-purple-900'
    );
    
    html += '</div>';

    // Charts Section
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

    // Recent Measurements Chart
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
    html += '<h3 class="text-lg font-semibold mb-4">Recent Measurements</h3>';
    html += '<div class="chart-container"><canvas id="measurements-chart"></canvas></div>';
    html += '</div>';

    // Parameter Distribution
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
    html += '<h3 class="text-lg font-semibold mb-4">Parameter Distribution</h3>';
    html += '<div class="chart-container"><canvas id="parameters-chart"></canvas></div>';
    html += '</div>';

    html += '</div>';

    // Recent Data Table
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
    html += '<h3 class="text-lg font-semibold mb-4">Recent Data Submissions</h3>';
    
    if (measurements && measurements.data && measurements.data.length > 0) {
      const rows = measurements.data.slice(0, 10).map(m => [
        formatDateTime(m.timestamp),
        m.parameter_name || m.parameter || '-',
        m.type === 'influent' ? 'Influent' : 'Effluent',
        formatNumber(m.value, 2),
        m.unit || '-'
      ]);
      html += createTable(['Date/Time', 'Parameter', 'Type', 'Value', 'Unit'], rows);
    } else {
      html += '<p class="text-gray-600 dark:text-gray-400">No recent data</p>';
    }
    
    html += '</div>';

    content.innerHTML = html;
    initIcons();

    // Draw charts
    await drawDashboardCharts(measurements, alerts, report);

  } catch (error) {
    setError('dashboard-content', `Error loading dashboard: ${error.message}`);
  }
}

function createKpiCard(title, value, icon, bgClass) {
  return `
    <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md ${bgClass} flex items-center justify-between">
      <div>
        <p class="text-gray-600 dark:text-gray-400 text-sm">${title}</p>
        <p class="text-3xl font-bold mt-2">${value}</p>
      </div>
      <div class="text-4xl opacity-20">
        <i data-lucide="${icon}"></i>
      </div>
    </div>
  `;
}

async function drawDashboardCharts(measurements, alerts, report) {
  try {
    // Clear existing charts
    Object.values(dashboardCharts).forEach(chart => {
      if (chart) chart.destroy();
    });
    dashboardCharts = {};

    // Recent Measurements Chart
    if (measurements && measurements.data) {
      const last30 = measurements.data.slice(-30);
      const labels = last30.map(m => formatDate(m.timestamp));
      
      const parametersData = {};
      last30.forEach(m => {
        const param = m.parameter_name || m.parameter || 'Unknown';
        if (!parametersData[param]) {
          parametersData[param] = [];
        }
        parametersData[param].push(m.value);
      });

      const datasets = Object.entries(parametersData).map(([param, values]) => ({
        label: param,
        data: values
      }));

      dashboardCharts.measurements = createLineChart('measurements-chart', labels, datasets);
    }

    // Parameter Distribution
    if (report && report.parameter_stats) {
      const labels = report.parameter_stats.map(p => p.parameter);
      const data = report.parameter_stats.map(p => p.count);
      
      dashboardCharts.parameters = createBarChart('parameters-chart', labels, [{
        label: 'Records',
        data
      }]);
    }

  } catch (error) {
    console.error('Error drawing charts:', error);
  }
}
