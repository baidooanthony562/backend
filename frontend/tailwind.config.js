export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4AF37',
          green: '#0F3D24',
          dark: '#101010',
        },
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 61, 36, 0.12)',
      },
    },
  },
  plugins: [],
};
