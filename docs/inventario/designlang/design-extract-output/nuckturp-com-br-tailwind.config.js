/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(82, 100%, 97%)',
            '100': 'hsl(82, 100%, 94%)',
            '200': 'hsl(82, 100%, 86%)',
            '300': 'hsl(82, 100%, 76%)',
            '400': 'hsl(82, 100%, 64%)',
            '500': 'hsl(82, 100%, 50%)',
            '600': 'hsl(82, 100%, 40%)',
            '700': 'hsl(82, 100%, 32%)',
            '800': 'hsl(82, 100%, 24%)',
            '900': 'hsl(82, 100%, 16%)',
            '950': 'hsl(82, 100%, 10%)',
            DEFAULT: '#beff4d'
        },
        secondary: {
            '50': 'hsl(268, 100%, 97%)',
            '100': 'hsl(268, 100%, 94%)',
            '200': 'hsl(268, 100%, 86%)',
            '300': 'hsl(268, 100%, 76%)',
            '400': 'hsl(268, 100%, 64%)',
            '500': 'hsl(268, 100%, 50%)',
            '600': 'hsl(268, 100%, 40%)',
            '700': 'hsl(268, 100%, 32%)',
            '800': 'hsl(268, 100%, 24%)',
            '900': 'hsl(268, 100%, 16%)',
            '950': 'hsl(268, 100%, 10%)',
            DEFAULT: '#c08aff'
        },
        accent: {
            '50': 'hsl(82, 85%, 97%)',
            '100': 'hsl(82, 85%, 94%)',
            '200': 'hsl(82, 85%, 86%)',
            '300': 'hsl(82, 85%, 76%)',
            '400': 'hsl(82, 85%, 64%)',
            '500': 'hsl(82, 85%, 50%)',
            '600': 'hsl(82, 85%, 40%)',
            '700': 'hsl(82, 85%, 32%)',
            '800': 'hsl(82, 85%, 24%)',
            '900': 'hsl(82, 85%, 16%)',
            '950': 'hsl(82, 85%, 10%)',
            DEFAULT: '#77b30f'
        },
        'neutral-50': '#383838',
        'neutral-100': '#f7ffe6',
        'neutral-200': '#8c8c8c',
        'neutral-300': '#000000',
        'neutral-400': '#1f1f1f',
        'neutral-500': '#0f0f0f',
        'neutral-600': '#2e2e2e',
        'neutral-700': '#f6f6f4',
        'neutral-800': '#ffffff',
        background: '#1a1a1a',
        foreground: '#000000'
    },
    fontFamily: {
        body: [
            'Inter',
            'sans-serif'
        ],
        heading: [
            'Space Grotesk',
            'sans-serif'
        ]
    },
    fontSize: {
        '10': [
            '10px',
            {
                lineHeight: '15px'
            }
        ],
        '12': [
            '12px',
            {
                lineHeight: '16px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: '20px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '24px'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '28px'
            }
        ],
        '24': [
            '24px',
            {
                lineHeight: '32px'
            }
        ],
        '30': [
            '30px',
            {
                lineHeight: '36px'
            }
        ],
        '36': [
            '36px',
            {
                lineHeight: '40px'
            }
        ],
        '96': [
            '96px',
            {
                lineHeight: '96px',
                letterSpacing: '-4.8px'
            }
        ]
    },
    spacing: {
        '1': '2px',
        '48': '96px',
        '64': '128px',
        '76': '152px',
        '96': '192px',
        '128': '256px'
    },
    borderRadius: {
        lg: '16px',
        xl: '24px',
        full: '9999px'
    },
    boxShadow: {
        sm: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(190, 255, 77, 0.25) 0px 10px 15px -3px, rgba(190, 255, 77, 0.25) 0px 4px 6px -4px'
    },
    screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '1400px': '1400px'
    },
    transitionDuration: {
        '100': '0.1s',
        '150': '0.15s',
        '200': '0.2s',
        '300': '0.3s',
        '400': '0.4s',
        '500': '0.5s',
        '700': '0.7s'
    },
    transitionTimingFunction: {
        custom: 'cubic-bezier(0.4, 0, 0.2, 1)',
        default: 'ease'
    },
    container: {
        center: true,
        padding: '0px'
    },
    maxWidth: {
        container: '100%'
    }
},
  },
};
