/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // TrackOwl Official Palette
                primary: '#965123',
                'dark-brown': '#472D1F',
                'base-white': '#FAFAFA',
                
                // Semantic Mapping
                background: 'var(--bg-main)',
                surface: 'var(--bg-surface)',
                border: 'var(--border-color)',
            },
            fontFamily: {
                sans: ['Poppins', 'Helvetica', 'sans-serif'],
                poppins: ['Poppins', 'sans-serif'],
                helvetica: ['Helvetica', 'sans-serif'],
            },
            borderRadius: {
                'shell-sm': '6px',
                'shell-md': '10px',
                'shell-lg': '14px',
                'shell-xl': '20px',
            },
            boxShadow: {
                'shell-sm': '0 1px 2px 0 rgba(71, 45, 31, 0.05)',
                'shell-md': '0 4px 6px -1px rgba(71, 45, 31, 0.1)',
                'premium': '0 20px 25px -5px rgba(71, 45, 31, 0.05)',
                'soft': '0 4px 20px -2px rgba(71, 45, 31, 0.08)',
            },
        },
    },
    plugins: [],
}