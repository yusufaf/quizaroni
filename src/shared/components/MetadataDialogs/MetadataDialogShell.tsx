import { Dialog, DialogContent, Tabs, Tab, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { MetadataDialogShellProps } from './types';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        height: '40rem',
        maxHeight: '90vh',
    },
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-root': {
        fontSize: '1rem',
        fontWeight: 500,
        textTransform: 'none',
        minHeight: '3rem',
    },
}));

export const MetadataDialogShell = ({
    open,
    onClose,
    title,
    tabs,
    selectedTab,
    onTabChange,
    children,
    maxWidth = 'lg',
}: MetadataDialogShellProps) => {
    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
            <StandardDialogTitle title={title} onClose={onClose} />

            <StyledTabs
                value={selectedTab}
                onChange={(_, newValue) => onTabChange(newValue)}
                variant="fullWidth"
            >
                {tabs.map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        label={tab.label}
                        icon={tab.icon}
                        iconPosition="start"
                    />
                ))}
            </StyledTabs>

            <DialogContent sx={{ p: '1.5rem' }}>{children}</DialogContent>
        </StyledDialog>
    );
};
