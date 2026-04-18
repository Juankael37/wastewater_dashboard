/**
 * AquaDash Utility Functions
 */

// Formatting
function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// Numbers
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toFixed(decimals);
}

function formatPercent(value) {
  return `${formatNumber(value, 1)}%`;
}

// UI Helpers
function createAlert(type, message) {
  const alertId = 'alert-' + Date.now();
  const bgColor = type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : 'bg-blue-100';
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';
  
  const alertHtml = `
    <div id="${alertId}" class="${bgColor} ${textColor} px-4 py-3 rounded mb-4 flex justify-between items-center">
      <span>${message}</span>
      <button onclick="document.getElementById('${alertId}').remove()" class="ml-4 font-bold">&times;</button>
    </div>
  `;
  
  return alertHtml;
}

function showNotification(type, message) {
  const container = document.createElement('div');
  container.innerHTML = createAlert(type, message);
  document.body.insertBefore(container.firstElementChild, document.body.firstChild);
  
  setTimeout(() => {
    const alert = document.getElementById(container.firstElementChild.id);
    if (alert) alert.remove();
  }, 5000);
}

// Chart Helpers
function getChartColors(count = 1) {
  const colors = [
    '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308'
  ];
  return Array(count).fill(0).map((_, i) => colors[i % colors.length]);
}

function createLineChart(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        borderColor: getChartColors(datasets.length)[i],
        backgroundColor: `${getChartColors(datasets.length)[i]}20`,
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: false }
        }
      }
    }
  });
}

function createBarChart(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: getChartColors(datasets.length)[i]
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Table Helpers
function createTable(columns, rows) {
  let html = '<table class="w-full border-collapse border border-gray-300 dark:border-slate-600">';
  
  // Header
  html += '<thead class="bg-gray-100 dark:bg-slate-700">';
  html += '<tr>';
  columns.forEach(col => {
    html += `<th class="border border-gray-300 dark:border-slate-600 p-3 text-left">${col}</th>`;
  });
  html += '</tr>';
  html += '</thead>';
  
  // Body
  html += '<tbody>';
  rows.forEach(row => {
    html += '<tr class="hover:bg-gray-50 dark:hover:bg-slate-800">';
    row.forEach(cell => {
      html += `<td class="border border-gray-300 dark:border-slate-600 p-3">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  html += '</table>';
  
  return html;
}

// Icons
function getIconHtml(name, size = 'w-5 h-5') {
  return `<i data-lucide="${name}" class="${size}"></i>`;
}

// Initialize icons after content update
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Theme
function initTheme() {
  const isDark = localStorage.getItem('aquadash-theme') === 'dark' || 
                 (!localStorage.getItem('aquadash-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('aquadash-theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('aquadash-theme', 'dark');
  }
}

// Loading states
function setLoading(elementId, isLoading = true) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  if (isLoading) {
    el.innerHTML = '<div class="text-center py-8"><p>Loading...</p></div>';
  }
}

function setError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  el.innerHTML = `<div class="bg-red-100 text-red-800 p-4 rounded">${message}</div>`;
}
