// React Theme — extracted from https://nuckturp.com.br
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
 *   };
 *   fonts: {
    body: string;
 *   };
 *   fontSizes: {
    '10': string;
    '12': string;
    '14': string;
    '16': string;
    '20': string;
    '24': string;
    '30': string;
    '36': string;
    '96': string;
 *   };
 *   space: {
    '2': string;
    '96': string;
    '128': string;
    '152': string;
    '192': string;
    '256': string;
 *   };
 *   radii: {
    lg: string;
    xl: string;
    full: string;
 *   };
 *   shadows: {
    sm: string;
 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#beff4d",
    "secondary": "#c08aff",
    "accent": "#77b30f",
    "background": "#1a1a1a",
    "foreground": "#000000",
    "neutral50": "#383838",
    "neutral100": "#f7ffe6",
    "neutral200": "#8c8c8c",
    "neutral300": "#000000",
    "neutral400": "#1f1f1f",
    "neutral500": "#0f0f0f",
    "neutral600": "#2e2e2e",
    "neutral700": "#f6f6f4",
    "neutral800": "#ffffff"
  },
  "fonts": {
    "body": "'Space Grotesk', sans-serif"
  },
  "fontSizes": {
    "10": "10px",
    "12": "12px",
    "14": "14px",
    "16": "16px",
    "20": "20px",
    "24": "24px",
    "30": "30px",
    "36": "36px",
    "96": "96px"
  },
  "space": {
    "2": "2px",
    "96": "96px",
    "128": "128px",
    "152": "152px",
    "192": "192px",
    "256": "256px"
  },
  "radii": {
    "lg": "16px",
    "xl": "24px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(190, 255, 77, 0.25) 0px 10px 15px -3px, rgba(190, 255, 77, 0.25) 0px 4px 6px -4px"
  },
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#beff4d",
      "light": "hsl(82, 100%, 80%)",
      "dark": "hsl(82, 100%, 50%)"
    },
    "secondary": {
      "main": "#c08aff",
      "light": "hsl(268, 100%, 92%)",
      "dark": "hsl(268, 100%, 62%)"
    },
    "background": {
      "default": "#1a1a1a",
      "paper": "#1f1f1f"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#f7ffe6"
    }
  },
  "typography": {
    "fontFamily": "'Inter', sans-serif",
    "h1": {
      "fontSize": "36px",
      "fontWeight": "700",
      "lineHeight": "40px"
    },
    "h2": {
      "fontSize": "24px",
      "fontWeight": "700",
      "lineHeight": "32px"
    },
    "h3": {
      "fontSize": "20px",
      "fontWeight": "400",
      "lineHeight": "28px"
    },
    "body1": {
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "24px"
    }
  },
  "shape": {
    "borderRadius": 12
  },
  "shadows": [
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(132, 255, 0, 0.2) 0px 0px 20px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(190, 255, 77, 0.05) 0px 25px 50px -12px"
  ]
};

export default theme;
