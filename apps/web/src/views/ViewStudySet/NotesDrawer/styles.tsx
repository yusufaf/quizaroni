import { Drawer, Box, Typography } from '@mui/material/';
import styled from '@emotion/styled';

const drawerScrollbar = (theme: any) => ({
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        background:
            theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(0,0,0,0.2)',
        borderRadius: '0.25rem',
        '&:hover': {
            background:
                theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(0,0,0,0.3)',
        },
    },
});

export const StyledDrawer = styled(Drawer, {
    shouldForwardProp: (prop) => prop !== 'isFloating',
})<{ anchor?: 'left' | 'right'; isFloating?: boolean }>(
    ({ theme, anchor, isFloating = true }) =>
        isFloating
            ? {
                  // Wide screens: an elegant panel that floats in the empty
                  // margin beside the content, so its background is transparent.
                  '& .MuiDrawer-paper': {
                      position: 'fixed',
                      top: '5rem',
                      height: 'calc(100vh - 5rem)',
                      width: 'min(24rem, calc(100vw - 3rem))',
                      ...(anchor === 'left'
                          ? { left: '1.5rem' }
                          : { right: '1.5rem' }),
                      overflowY: 'auto',
                      border: 'none',
                      background: 'transparent',
                      '& > div': {
                          background: 'inherit',
                      },
                      ...drawerScrollbar(theme),
                  },
              }
            : {
                  // Narrow screens: a standard temporary drawer that slides over
                  // the content with a solid background and a backdrop, so it
                  // never bleeds through onto the page behind it.
                  '& .MuiDrawer-paper': {
                      width: 'min(24rem, calc(100vw - 3rem))',
                      overflowY: 'auto',
                      backgroundColor: theme.palette.background.paper,
                      backgroundImage: 'none',
                      ...drawerScrollbar(theme),
                  },
              }
);

export const CardPreviewText = styled(Typography)({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
});

export const EmptyStateBox = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    textAlign: 'center',
});
