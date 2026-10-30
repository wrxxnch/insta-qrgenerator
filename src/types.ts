export type QRStyle = 'squares' | 'dots' | 'rounded';
export type LogoStyle = 'classic' | 'white' | 'dark' | 'none';
export type QRType = 'card' | 'qr-only';

export interface InstagramGradient {
  id: string;
  name: string;
  colors: string[];
  cssGradient: string;
}

export interface QRConfig {
  username: string;
  styleId: string;
  customColor1: string;
  customColor2: string;
  qrType: QRType;
  qrColor: string;
  qrBgColor: string;
  qrStyle: QRStyle;
  logoStyle: LogoStyle;
  showUsername: boolean;
  showInstruction: boolean;
  instructionText: string;
  size: number;
  contrastDots: boolean;
  contrastEyes: boolean;
  gradientAngle: number;
}

export const INSTAGRAM_GRADIENTS: InstagramGradient[] = [
  {
    id: 'classic',
    name: 'Clássico Instagram',
    colors: ['#F9ED32', '#EE2A7B', '#002F86'], // Yellow to pink to dark blue
    cssGradient: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  },
  {
    id: 'redPurple',
    name: 'Roxo e Vermelho',
    colors: ['#FF0169', '#7638FA'],
    cssGradient: 'linear-gradient(to right top, rgb(255, 1, 105), rgb(118, 56, 250))',
  },
  {
    id: 'orangePurple',
    name: 'Laranja e Roxo',
    colors: ['#FD8D50', '#A307BA'],
    cssGradient: 'linear-gradient(to right top, rgb(253, 141, 50), rgb(163, 7, 186))',
  },
  {
    id: 'bluePurple',
    name: 'Azul e Roxo',
    colors: ['#27C4F5', '#A307BA'],
    cssGradient: 'linear-gradient(to right top, rgb(39, 196, 245), rgb(163, 7, 186))',
  },
  {
    id: 'blue',
    name: 'Ciano e Azul',
    colors: ['#54D7FF', '#1372CC'],
    cssGradient: 'linear-gradient(to right top, rgb(84, 215, 255), rgb(19, 114, 204))',
  },
  {
    id: 'solidBlue',
    name: 'Azul do Facebook',
    colors: ['#0866FF', '#0866FF'],
    cssGradient: 'linear-gradient(to right top, rgb(8, 102, 255), rgb(8, 102, 255))',
  },
  {
    id: 'green',
    name: 'Verde e Azul',
    colors: ['#70C050', '#27C4F5'],
    cssGradient: 'linear-gradient(to right top, rgb(112, 192, 80), rgb(39, 196, 245))',
  },
  {
    id: 'grey',
    name: 'Cinza Escuro',
    colors: ['#737373', '#262626'],
    cssGradient: 'linear-gradient(to right top, rgb(115, 115, 115), rgb(38, 38, 38))',
  },
  {
    id: 'black',
    name: 'Preto Total',
    colors: ['#000000', '#000000'],
    cssGradient: 'linear-gradient(to right top, rgb(0, 0, 0), rgb(0, 0, 0))',
  },
  {
    id: 'custom',
    name: 'Personalizado',
    colors: ['#4F46E5', '#EC4899'],
    cssGradient: 'linear-gradient(to right top, var(--custom-color-1, #4F46E5), var(--custom-color-2, #EC4899))',
  }
];
