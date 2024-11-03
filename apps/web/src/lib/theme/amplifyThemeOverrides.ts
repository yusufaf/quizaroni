import { Theme } from '@mui/material/styles';
import { Theme as AmplifyTheme } from '@aws-amplify/ui-react';

export const amplifyThemeOverrides = (muiTheme: Theme): AmplifyTheme => ({
    name: 'custom-amplify-theme',
    tokens: {
        colors: {
            brand: {
                primary: {
                    10: muiTheme.palette.primary.light,
                    80: muiTheme.palette.primary.main,
                    100: muiTheme.palette.primary.dark,
                },
            },
            background: {
                primary: muiTheme.palette.background.default,
                secondary: muiTheme.palette.background.paper,
            },
            font: {
                primary: muiTheme.palette.text.primary,
                secondary: muiTheme.palette.text.secondary,
            },
        },
        components: {
            button: {
                primary: {
                    backgroundColor: muiTheme.palette.primary.main,
                    color: muiTheme.palette.primary.contrastText,
                    // fontWeight: 'bold',
                },
            },
            input: {
                borderColor: muiTheme.palette.divider,
                color: muiTheme.palette.text.primary,
                // focus: {
                //     borderColor: muiTheme.palette.primary.main,
                // },
            },
            tabs: {
                item: {
                    _active: {
                        color: muiTheme.palette.primary.main,
                    },

                    borderColor: muiTheme.palette.primary.main,
                    color: muiTheme.palette.common.white,
                },
            },
        },
    },
});
