import { useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from 'theme/useTheme';
import { StyledChromePicker } from 'styles/AppStyles';

type Props = {
    color: string;
    onChange: (e: any) => void;
};

export const ColorPickerPanel = ({ color, onChange }: Props) => {
    const { muiTheme } = useTheme();

    useEffect(() => {
        // Style the color picker input fields to match theme
        const elements = document.querySelectorAll('[id]');
        for (const el of elements) {
            if (el.id.startsWith('rc-editable-input')) {
                const domElement = document.getElementById(el.id);
                if (domElement) {
                    domElement.style.color = muiTheme.palette.text.primary;
                    domElement.style.background = muiTheme.palette.grey[800];
                }
            }
        }
    }, [muiTheme]);

    return (
        <Box>
            <Paper
                variant="outlined"
                sx={{ p: '1rem', display: 'inline-block' }}
            >
                <StyledChromePicker color={color} onChange={onChange} />
            </Paper>
        </Box>
    );
};
