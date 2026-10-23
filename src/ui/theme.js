export const THEMES = {
  paper: {
    name: 'paper',
    label: '纸张',
    background: '#f6f1e7',
    foreground: '#3b352c',
    dim: '#8a7f6c',
    accent: '#8a5a2b',
    track: '#d9cfbf',
    warn: '#a64b2a'
  },
  night: {
    name: 'night',
    label: '夜间',
    background: '#1f1e1b',
    foreground: '#d8d2c4',
    dim: '#8b8578',
    accent: '#c9a86a',
    track: '#3a362f',
    warn: '#e0a96d'
  }
};

export function themeOf(name) {
  return THEMES[name] || THEMES.paper;
}
