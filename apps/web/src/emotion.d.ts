import type { Theme as MuiTheme } from '@mui/material/styles';

// `styled` from @emotion/styled types its `theme` callback arg as emotion's own
// Theme, which is empty by default. The ThemeProvider actually supplies MUI's
// theme, so tell emotion what it is really handing out.
declare module '@emotion/react' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface Theme extends MuiTheme {}
}
