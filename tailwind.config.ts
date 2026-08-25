import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { navy: '#0d4261', ink: '#17233b', blue: '#0b83df' }, boxShadow: { soft: '0 8px 22px rgba(13, 66, 97, .10)' } } }, plugins: [] } satisfies Config;
