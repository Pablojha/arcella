// Applies the saved (or system) dark theme before the first paint, so pages never flash light.
try {
  // Kept across visits only with consent; otherwise it lives in this visit's session storage.
  var theme = localStorage.getItem('arcella_theme') || sessionStorage.getItem('arcella_theme');
  if (theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
} catch (e) {}
