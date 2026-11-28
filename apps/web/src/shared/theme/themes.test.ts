import { describe, it } from 'vite-plus/test';
import { assertContrast } from './contrastTestUtils';
import { createDarkTheme, createLightTheme } from './themes';

describe.each([
    ['light', createLightTheme()],
    ['dark', createDarkTheme()],
])('%s theme primary text', (_name, theme) => {
    const { other, background, action } =
        theme.palette as typeof theme.palette & {
            other: { primaryText: string };
        };

    it('reaches 4.5:1 on paper and default backgrounds', () => {
        assertContrast(other.primaryText, background.paper, 4.5);
        assertContrast(other.primaryText, background.default, 4.5);
    });

    it('reaches 4.5:1 on the hover tint', () => {
        assertContrast(other.primaryText, action.hover, 4.5, background.paper);
    });
});
