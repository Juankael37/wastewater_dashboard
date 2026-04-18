/**
 * AquaDash Alerts Page
 * Manage and view alerts
 */

async function loadAlerts() {
  const content = document.getElementById('alerts-content');
  setLoading('alerts-content');

  try {
    const alertsData = await api.getAlertsDashboard();

    let html = '';

    // Filter controls
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
    html += '<h3 class="text-lg font-semibold mb-4">Alerts</h3>';
    html += '<div class="flex flex-wrap gap-3 mb-4">';
    html += '<button onclick="filterAlerts(\'all\')" class="px-3 py-2 rounded bg-gray-200 dark:bg-slate-700 text-sm hover:bg-teal-500 hover:text-white">All</button>';
    html += '<button onclick="filterAlerts(\'critical\')" class="px-3 py-2 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm hover:bg-red-500 hover:text-white">Critical</button>';
    html += '<button onclick="filterAlerts(\'warning\')" class="px-3 py-2 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm hover:bg-yellow-500 hover:text-white">Warning</button>';
    html += '<button onclick="filterAlerts(\'info\')" class="px-3 py-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm hover:bg-blue-500 hover:text-white">Info</button>';
    html += '</div>';
    html += '</div>';

    // Active Alerts
    if (alertsData && alertsData.active && alertsData.active.length > 0) {
      html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
      html += '<h3 class="text-lg font-semibold mb-4 text-red-600">Active Alerts (' + alertsData.active.length + ')</h3>';
      
      alertsData.active.forEach(alert => {
        html += createAlertCard(alert, true);
      });
      
      html += '</div>';
    }

    // Resolved Alerts
    if (alertsData && alertsData.resolved && alertsData.resolved.length > 0) {
      html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
      html += '<h3 class="text-lg font-semibold mb-4 text-green-600">Resolved Alerts (' + alertsData.resolved.length + ')</h3>';
      
      alertsData.resolved.forEach(alert => {
        html += createAlertCard(alert, false);
      });
      
      html += '</div>';
    }

    if (!alertsData || ((!alertsData.active || alertsData.active.length === 0) && 
                         (!alertsData.resolved || alertsData.resolved.length === 0))) {
      html = '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-center py-12">';
      html += '<p class="text-gray-600 dark:text-gray-400">No alerts found</p>';
      html += '</div>';
    }

    content.innerHTML = html;
    initIcons();

  } catch (error) {
    setError('alerts-content', `Error loading alerts: ${error.message}`);
  }
}

function createAlertCard(alert, isActive) {
  const severityColor = {
    'critical': 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200',
    'warning': 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500 text-yellow-800 dark:text-yellow-200',
    'info': 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-800 dark:text-blue-200'
  };

  const color = severityColor[alert.severity] || severityColor['info'];

  let html = `<div class="border-l-4 p-4 mb-3 rounded ${color}">`;
  html += '<div class="flex justify-between items-start">';
  html += '<div>';
  html += `<p class="font-semibold">${alert.parameter || 'Unknown Parameter'}</p>`;
  html += `<p class="text-sm mt-1">${alert.message || 'Alert threshold exceeded'}</p>`;
  html += `<p class="text-xs mt-2 opacity-75">Value: ${formatNumber(alert.value, 2)} | ${formatDateTime(alert.timestamp)}</p>`;
  html += '</div>';

  if (isActive && api.isAdmin()) {
    html += `<button onclick="resolveAlert('${alert.id}')" class="px-3 py-1 rounded bg-green-500 text-white text-sm hover:bg-green-600">Resolve</button>`;
  } else if (!isActive && alert.resolved_at) {
    html += `<span class="text-xs opacity-75">Resolved: ${formatDateTime(alert.resolved_at)}</span>`;
  }

  html += '</div>';
  html += '</div>';

  return html;
}

async function resolveAlert(alertId) {
  try {
    await api.resolveAlert(alertId);
    showNotification('success', 'Alert resolved');
    await loadAlerts();
  } catch (error) {
    showNotification('error', `Failed to resolve alert: ${error.message}`);
  }
}

function filterAlerts(severity) {
  // This would require re-fetching and filtering
  // For now, just show notification
  showNotification('info', `Filtering by ${severity} severity`);
  loadAlerts(); // Reload to refresh
}
