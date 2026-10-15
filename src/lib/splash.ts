/**
 * Pantallas de carga de iOS (apple-touch-startup-image). iOS solo las usa si
 * el tamaño coincide exactamente con el del dispositivo, por eso hay una por modelo.
 */
export const IOS_SPLASH: { w: number; h: number; dpr: number; models: string }[] = [
  { w: 440, h: 956, dpr: 3, models: "iPhone 16 Pro Max" },
  { w: 402, h: 874, dpr: 3, models: "iPhone 16 Pro" },
  { w: 430, h: 932, dpr: 3, models: "iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus" },
  { w: 393, h: 852, dpr: 3, models: "iPhone 14 Pro, 15, 15 Pro, 16" },
  { w: 428, h: 926, dpr: 3, models: "iPhone 12/13 Pro Max, 14 Plus" },
  { w: 390, h: 844, dpr: 3, models: "iPhone 12, 13, 14" },
  { w: 375, h: 812, dpr: 3, models: "iPhone X, XS, 11 Pro, 12/13 mini" },
  { w: 414, h: 896, dpr: 3, models: "iPhone XS Max, 11 Pro Max" },
  { w: 414, h: 896, dpr: 2, models: "iPhone XR, 11" },
  { w: 375, h: 667, dpr: 2, models: "iPhone SE (2.ª y 3.ª gen), 8" },
];

export const splashName = (s: { w: number; h: number; dpr: number }) => `iphone-${s.w * s.dpr}x${s.h * s.dpr}.png`;

export const splashMedia = (s: { w: number; h: number; dpr: number }) =>
  `(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`;
