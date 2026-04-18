/**
 * AquaDash Settings Page (Admin Only)
 * Manage users, parameters, and data
 */

async function loadSettings() {
  const content = document.getElementById('settings-content');
  
  // TEMPORARY: Disabled for testing. Re-enable after setting admin role.
  // if (!api.isAdmin()) {
  //   content.innerHTML = '<div class="bg-red-100 text-red-800 p-4 rounded">Admin access required</div>';
  //   return;
  // }

  setLoading('settings-content');

  try {
    const [users, parameters] = await Promise.all([
      api.getUsers(),
      api.getParameters()
    ]);

    let html = '';

    // Tabs
    html += '<div class="flex gap-4 mb-6 border-b border-gray-300 dark:border-slate-600">';
    html += '<button onclick="switchSettingsTab(\'users\')" class="settings-tab px-4 py-2 border-b-2 border-teal-500 text-teal-500" data-tab="users">Users</button>';
    html += '<button onclick="switchSettingsTab(\'parameters\')" class="settings-tab px-4 py-2 border-b border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:text-teal-500" data-tab="parameters">Parameters</button>';
    html += '<button onclick="switchSettingsTab(\'data\')" class="settings-tab px-4 py-2 border-b border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:text-teal-500" data-tab="data">Data Management</button>';
    html += '</div>';

    // Users Tab
    html += '<div class="settings-tab-content" data-tab="users">';
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
    html += '<h3 class="text-lg font-semibold mb-4">User Management</h3>';
    
    if (users && users.data && users.data.length > 0) {
      const rows = users.data.map(u => [
        u.email || '-',
        u.user_metadata?.full_name || u.profile?.full_name || '-',
        u.user_metadata?.role || u.profile?.role || 'operator',
        `<button onclick="deleteUser('${u.id}')" class="px-2 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600">Delete</button>`
      ]);
      html += createTable(['Email', 'Name', 'Role', 'Action'], rows);
    } else {
      html += '<p class="text-gray-600 dark:text-gray-400">No users found</p>';
    }
    html += '</div>';

    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
    html += '<h3 class="text-lg font-semibold mb-4">Add New User</h3>';
    html += '<form onsubmit="handleAddUser(event)" class="space-y-4">';
    html += '<input type="email" placeholder="Email" required class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-user-email">';
    html += '<input type="password" placeholder="Password" required class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-user-password">';
    html += '<input type="text" placeholder="Full Name" class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-user-name">';
    html += '<select id="new-user-role" class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700">';
    html += '<option value="operator">Operator</option>';
    html += '<option value="admin">Admin</option>';
    html += '</select>';
    html += '<button type="submit" class="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600">Add User</button>';
    html += '</form>';
    html += '</div>';
    html += '</div>';

    // Parameters Tab
    html += '<div class="settings-tab-content" data-tab="parameters" style="display:none;">';
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">';
    html += '<h3 class="text-lg font-semibold mb-4">Parameter Management</h3>';
    
    if (parameters && parameters.data && parameters.data.length > 0) {
      const rows = parameters.data.map(p => [
        p.name || p.parameter || '-',
        formatNumber(p.min_limit || 0, 2),
        formatNumber(p.max_limit || 0, 2),
        p.unit || '-',
        `<button onclick="deleteParameter('${p.name || p.parameter}')" class="px-2 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600">Delete</button>`
      ]);
      html += createTable(['Parameter', 'Min', 'Max', 'Unit', 'Action'], rows);
    } else {
      html += '<p class="text-gray-600 dark:text-gray-400">No parameters found</p>';
    }
    html += '</div>';

    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
    html += '<h3 class="text-lg font-semibold mb-4">Add Parameter</h3>';
    html += '<form onsubmit="handleAddParameter(event)" class="space-y-4">';
    html += '<input type="text" placeholder="Parameter Name" required class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-param-name">';
    html += '<input type="number" placeholder="Min Limit" step="0.01" class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-param-min">';
    html += '<input type="number" placeholder="Max Limit" step="0.01" required class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-param-max">';
    html += '<input type="text" placeholder="Unit (mg/L, pH, etc.)" class="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700" id="new-param-unit">';
    html += '<button type="submit" class="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600">Add Parameter</button>';
    html += '</form>';
    html += '</div>';
    html += '</div>';

    // Data Management Tab
    html += '<div class="settings-tab-content" data-tab="data" style="display:none;">';
    html += '<div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">';
    html += '<h3 class="text-lg font-semibold mb-4 text-red-600">Data Management</h3>';
    html += '<p class="text-gray-600 dark:text-gray-400 mb-6">Warning: These actions cannot be undone.</p>';
    
    html += '<div class="space-y-4">';
    html += '<div>';
    html += '<label class="block text-sm font-medium mb-2">Clear Data by Date Range</label>';
    html += '<div class="flex gap-2">';
    html += '<input type="date" id="clear-start-date" class="px-3 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700">';
    html += '<input type="date" id="clear-end-date" class="px-3 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700">';
    html += '<button onclick="clearDataRange()" class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">Clear Range</button>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="border-t border-gray-300 dark:border-slate-600 pt-4">';
    html += '<button onclick="clearAllData()" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Clear All Data</button>';
    html += '<p class="text-xs text-gray-600 dark:text-gray-400 mt-2">This will permanently delete all measurements.</p>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';

    content.innerHTML = html;
    initIcons();

  } catch (error) {
    setError('settings-content', `Error loading settings: ${error.message}`);
  }
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.classList.remove('border-b-2', 'border-teal-500', 'text-teal-500');
    btn.classList.add('border-b', 'border-gray-300', 'dark:border-slate-600', 'text-gray-600', 'dark:text-gray-400');
  });

  document.querySelectorAll('.settings-tab-content').forEach(content => {
    content.style.display = 'none';
  });

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('border-b-2', 'border-teal-500', 'text-teal-500');
  document.querySelector(`[data-tab="${tabName}"]`).classList.remove('border-b', 'border-gray-300', 'dark:border-slate-600', 'text-gray-600', 'dark:text-gray-400');

  document.querySelector(`.settings-tab-content[data-tab="${tabName}"]`).style.display = 'block';
}

async function handleAddUser(event) {
  event.preventDefault();
  
  const email = document.getElementById('new-user-email').value;
  const password = document.getElementById('new-user-password').value;
  const name = document.getElementById('new-user-name').value;
  const role = document.getElementById('new-user-role').value;

  try {
    await api.createUser({ email, password, full_name: name, role });
    showNotification('success', 'User created successfully');
    event.target.reset();
    await loadSettings();
  } catch (error) {
    showNotification('error', `Failed to create user: ${error.message}`);
  }
}

async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  
  try {
    await api.deleteUser(userId);
    showNotification('success', 'User deleted');
    await loadSettings();
  } catch (error) {
    showNotification('error', `Failed to delete user: ${error.message}`);
  }
}

async function handleAddParameter(event) {
  event.preventDefault();
  
  const name = document.getElementById('new-param-name').value;
  const min = parseFloat(document.getElementById('new-param-min').value) || 0;
  const max = parseFloat(document.getElementById('new-param-max').value);
  const unit = document.getElementById('new-param-unit').value;

  try {
    await api.createParameter({ name, min_limit: min, max_limit: max, unit });
    showNotification('success', 'Parameter created');
    event.target.reset();
    await loadSettings();
  } catch (error) {
    showNotification('error', `Failed to create parameter: ${error.message}`);
  }
}

async function deleteParameter(paramName) {
  if (!confirm('Are you sure you want to delete this parameter?')) return;
  
  try {
    await api.deleteParameter(paramName);
    showNotification('success', 'Parameter deleted');
    await loadSettings();
  } catch (error) {
    showNotification('error', `Failed to delete parameter: ${error.message}`);
  }
}

async function clearDataRange() {
  const startDate = document.getElementById('clear-start-date').value;
  const endDate = document.getElementById('clear-end-date').value;

  if (!startDate || !endDate) {
    showNotification('error', 'Please select both dates');
    return;
  }

  if (!confirm(`Clear data from ${startDate} to ${endDate}? This cannot be undone.`)) return;

  try {
    await api.clearDataRange(startDate, endDate);
    showNotification('success', 'Data cleared');
  } catch (error) {
    showNotification('error', `Failed to clear data: ${error.message}`);
  }
}

async function clearAllData() {
  if (!confirm('Are you absolutely sure you want to delete ALL data? This cannot be undone.')) return;
  if (!confirm('Confirm: Delete ALL measurements permanently?')) return;

  try {
    await api.clearAllData();
    showNotification('success', 'All data cleared');
  } catch (error) {
    showNotification('error', `Failed to clear data: ${error.message}`);
  }
}
