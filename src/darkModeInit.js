// Initialize dark mode on page load
(function initializeDarkMode() {
  // Check if the user has already set a preference
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (storedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // If no preference stored, add a class to respect OS preference
    document.documentElement.classList.add('dark-mode-auto');
  }
})();