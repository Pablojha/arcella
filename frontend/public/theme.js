// Applies the saved (or system) dark theme before the first paint, so pages never flash light.
try {
  var theme = localStorage.getItem('arcella_theme');
  if (theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
} catch (e) {}
