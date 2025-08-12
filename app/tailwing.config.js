/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./public/**/*.{html, js}'],
    theme: {
        extend: {
            keyframes: {
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '20%': { transform: 'translateX(-2px)' },
                    '40%': { transform: 'translateX(2px)' },
                    '60%': { transform: 'translateX(-2px)' },
                    '80%': { transform: 'translateX(2px)' },
                }
            },
            animation: {
                shake: 'shake 0.4s ease-in-out',
            }
        },
    },
    plugins: [],
};
export {};
