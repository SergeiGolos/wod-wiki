// Initialize dark mode on page load
(function initializeDarkMode() {
  // Check if the user has already set a preference
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (storedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // If no preference stored, check OS preference and apply dark class accordingly
    document.documentElement.classList.add('dark-mode-auto');
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
})();