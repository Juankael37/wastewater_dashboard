/**
 * AquaDash Main Application
 * Handles routing, authentication, and UI updates
 */

let currentPage = 'dashboard';
const pages = ['dashboard', 'reports', 'alerts', 'settings'];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initIcons();
  
  // Check authentication
  const auth = await api.checkAuth();
  if (!auth.authenticated) {
    window.location.href = './login.html';
    return;
  }

  // Update user info
  updateUserInfo();

  // Setup event listeners
  setupNavigation();
  setupLogout();
  setupThemeToggle();

  // Restrict admin pages
  restrictAdminPages();

  // Load initial page
  await loadPage('dashboard');
});

// Navigation
function setupNavigation() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = btn.dataset.nav;
      await loadPage(page);
    });
  });
}

async function loadPage(pageName) {
  if (!pages.includes(pageName)) return;

  // Update UI
  document.querySelectorAll('[data-page]').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.remove('bg-gray-200', 'dark:bg-slate-700', 'text-teal-500');
    btn.classList.add('text-gray-600', 'dark:text-gray-300');
  });
  document.querySelector(`[data-nav="${pageName}"]`).classList.add(
    'bg-gray-200', 'dark:bg-slate-700', 'text-teal-500'
  );
  document.querySelector(`[data-nav="${pageName}"]`).classList.remove(
    'text-gray-600', 'dark:text-gray-300'
  );

  // Update title
  const titles = {
    dashboard: 'Dashboard',
    reports: 'Reports',
    alerts: 'Alerts',
    settings: 'Settings'
  };
  document.getElementById('page-title').textContent = titles[pageName] || 'Dashboard';

  currentPage = pageName;

  // Call page-specific loader
  try {
    if (pageName === 'dashboard') {
      await loadDashboard();
    } else if (pageName === 'reports') {
      await loadReports();
    } else if (pageName === 'alerts') {
      await loadAlerts();
    } else if (pageName === 'settings') {
      await loadSettings();
    }
  } catch (error) {
    console.error(`Error loading ${pageName}:`, error);
    setError(`${pageName}-content`, `Failed to load ${pageName}: ${error.message}`);
  }
}

// User info
function updateUserInfo() {
  const user = api.currentUser;
  const userName = document.getElementById('user-name');
  const userRole = document.getElementById('user-role');

  if (user) {
    const name = user.user_metadata?.full_name || user.email || 'User';
    const role = user.user_metadata?.role || user.profile?.role || 'operator';
    
    userName.textContent = name;
    userRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  }
}

// Logout
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api.logout();
    window.location.href = './login.html';
  });
}

// Theme toggle
function setupThemeToggle() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    toggleTheme();
    initIcons(); // Refresh icons after theme change
  });
}

// Restrict admin pages
function restrictAdminPages() {
  // TEMPORARY: Disabled for testing. Re-enable after setting admin role.
  // const isAdmin = api.isAdmin();
  // const adminElements = document.querySelectorAll('.nav-admin, .nav-admin-content');
  // 
  // if (!isAdmin) {
  //   adminElements.forEach(el => el.style.display = 'none');
  //   
  //   // Redirect from settings if not admin
  //   if (currentPage === 'settings') {
  //     loadPage('dashboard');
  //   }
  // }
}

// Error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showNotification('error', 'An error occurred. Please try again.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showNotification('error', 'An error occurred. Please try again.');
});
