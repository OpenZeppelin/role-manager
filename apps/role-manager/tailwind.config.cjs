/** @type {import('tailwindcss').Config} */
module.exports = {
  // Minimal config for Tailwind v4
  // Theme configuration has moved to @openzeppelin/ui-builder-styles/global.css using @theme directives

  // Content paths are automatically detected by Tailwind v4 via the source() function in index.css
  // Theme is defined in global.css from the styles package

  darkMode: ['class'], // Use class strategy for dark mode

  // Plugins are still loaded via JS config in v4
  plugins: [
    require('tailwindcss-animate'), // Plugin for animations
    // Add any other app-specific Tailwind plugins here
  ],
};
