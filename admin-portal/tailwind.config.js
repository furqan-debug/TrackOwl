/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2563eb',
                'primary-hover': '#1d4ed8',
                secondary: '#475569',
                background: '#f8fafc',
                surface: '#ffffff',
                'surface-subtle': '#f1f5f9',
                border: '#e2e8f0',
                'border-subtle': '#f1f5f9',
                'text-primary': '#0f172a',
                'text-secondary': '#475569',
                'text-muted': '#94a3b8',
            },
            borderRadius: {
                'shell-sm': '0.375rem',
                'shell-md': '0.5rem',
                'shell-lg': '0.75rem',
            },
            boxShadow: {
                'shell-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'shell-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            ringOffsetColor: {
                'surface-subtle': '#f1f5f9',
            },
        },
    },
    plugins: [],
}