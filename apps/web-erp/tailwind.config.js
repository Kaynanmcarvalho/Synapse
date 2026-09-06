import preset from '@synapse/ui/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
