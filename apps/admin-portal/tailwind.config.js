/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Official Trackora Branding
                primary: '#4066D3',
                'primary-hover': '#3453B3',
                'primary-light': '#E8EDFB',
                secondary: '#F2F6FC',
                'secondary-hover': '#E2EAF7',
                
                // Layout & Surfaces
                background: '#F2F6FC',
                surface: '#FFFFFF',
                'surface-subtle': '#F8FAFD',
                
                // Borders
                border: '#E8ECF5',
                'border-subtle': '#F2F6FC',
                
                // Typography (Enterprise Slate)
                'text-primary': '#0F172A',
                'text-secondary': '#475569',
                'text-muted': '#94A3B8',
            },
            borderRadius: {
                'shell-sm': '0.375rem',
                'shell-md': '0.5rem',
                'shell-lg': '0.75rem',
                'shell-xl': '1rem',
            },
            boxShadow: {
                'shell-sm': '0 1px 2px 0 rgb(64 102 211 / 0.05)',
                'shell-md': '0 4px 6px -1px rgb(64 102 211 / 0.1), 0 2px 4px -2px rgb(64 102 211 / 0.1)',
                'premium': '0 20px 25px -5px rgb(64 102 211 / 0.05), 0 10px 10px -5px rgb(64 102 211 / 0.02)',
            },
            ringOffsetColor: {
                'surface-subtle': '#F8FAFD',
            },
        },
    },
    plugins: [],
}