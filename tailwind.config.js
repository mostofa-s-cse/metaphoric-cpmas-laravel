import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                slate: {
                    250: '#d7dfe9',
                    350: '#b0bccd',
                    355: '#adbaca',
                    450: '#7c8ca2',
                    455: '#7a899f',
                    550: '#56657a',
                    650: '#3d4b5f',
                    750: '#293548',
                    850: '#172033',
                },
            },
        },
    },

    plugins: [forms],
};
