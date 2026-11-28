import { createAppTheme } from './createAppTheme';
import { QUIZARONI_DARK, QUIZARONI_LIGHT } from './registry';

export const createLightTheme = (fontScale: number = 1) =>
    createAppTheme(QUIZARONI_LIGHT, undefined, fontScale);
export const createDarkTheme = (fontScale: number = 1) =>
    createAppTheme(QUIZARONI_DARK, undefined, fontScale);

// Backward compatibility - default exports
export const light = createLightTheme();
export const dark = createDarkTheme();
export const themes = { light, dark };
