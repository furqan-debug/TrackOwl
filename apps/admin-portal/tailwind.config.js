/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary)',
                'primary-hover': 'var(--primary-hover)',
                accent: 'var(--accent)',
                'accent-hover': 'var(--accent-hover)',
                'gold-hover': 'var(--gold-hover)',
                navy: '#001B4D',
                
                // Backgrounds
                background: 'var(--bg-main)',
                workspace: 'var(--bg-workspace)',
                surface: 'var(--bg-surface)',
                'surface-hover': 'var(--bg-surface-hover)',
                'menu-active': 'var(--bg-menu-active)',

                // Status
                success: 'var(--color-success)',
                'success-soft': 'var(--color-success-soft)',
                warning: 'var(--color-warning)',
                'warning-soft': 'var(--color-warning-soft)',
                error: 'var(--color-error)',
                'error-soft': 'var(--color-error-soft)',
                info: 'var(--color-info)',
                'info-soft': 'var(--color-info-soft)',

                // Borders
                border: 'var(--border-color)',
                'border-soft': 'var(--border-soft)',
                'border-divider': 'var(--border-divider)',
                'border-input': 'var(--border-input)',
                'border-btn-secondary': 'var(--border-btn-secondary)',

                // Text
                'text-main': 'var(--text-main)',
                'text-secondary': 'var(--text-secondary)',
                'text-muted': 'var(--text-muted)',
                'text-gold': 'var(--text-gold)',

                // Charts
                'chart-gold': 'var(--color-chart-gold)',
                'chart-navy': 'var(--color-chart-navy)',
                'chart-blue': 'var(--color-chart-blue)',
                'chart-purple': 'var(--color-chart-purple)',
                'chart-gray': 'var(--color-chart-gray)',
            },
            backgroundImage: {
                'sidebar-gradient': 'var(--gradient-sidebar)',
                'gold-card-gradient': 'var(--gradient-gold-card)',
                'navy-btn-gradient': 'var(--gradient-navy-btn)',
                'gold-btn-gradient': 'var(--gradient-gold-btn)',
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                heading: ['"Outfit"', 'sans-serif'],
            },
            borderRadius: {
                'shell-sm': '6px',
                'shell-md': '12px',
                'shell-lg': '16px',
                'shell-xl': '24px',
            },
            boxShadow: {
                'shell-sm': '0 1px 2px 0 rgba(0, 27, 77, 0.05)',
                'shell-md': '0 4px 6px -1px rgba(0, 27, 77, 0.1)',
                'premium': '0 20px 25px -5px rgba(0, 27, 77, 0.05)',
                'soft': '0 10px 30px -5px rgba(0, 27, 77, 0.08)',
            },
        },
    },
    plugins: [],
}