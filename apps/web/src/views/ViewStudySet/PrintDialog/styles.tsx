import { DialogContent, Button } from '@mui/material';
import styled from '@emotion/styled';

export const StyledDialogContent = styled(DialogContent)({
    display: 'grid',
    gridTemplateColumns: '60% 40%',
    gap: '2rem',
    height: 'calc(100vh - 4rem)',
    padding: '1.5rem',
    overflow: 'hidden',
});

export const PreviewPanel = styled('div')(({ theme }) => ({
    border: `0.0625rem solid ${theme.palette.divider}`,
    borderRadius: '0.5rem',
    overflow: 'auto',
    backgroundColor: theme.palette.background.default,
    padding: '1rem',
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-thumb': {
        borderRadius: '0.25rem',
        background: theme.palette.grey[500],
    },
}));

export const SettingsPanel = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    overflow: 'auto',
    padding: '1rem',
});

export const PrintButton = styled(Button)({
    marginTop: 'auto',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    textTransform: 'none',
});

export const PrintPreviewContainer = styled('div')({
    minHeight: '100%',
    backgroundColor: 'white',
    color: 'black',
    padding: '2rem',
    '@media print': {
        padding: '0',
        minHeight: 'auto',
    },
});

// Flashcard Layout Styles
export const FlashcardPage = styled('div')({
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
    pageBreakAfter: 'always',
    '@media print': {
        pageBreakAfter: 'always',
    },
});

export const FlashcardTitle = styled('h2')({
    fontSize: '2rem',
    marginBottom: '2rem',
    textAlign: 'center',
});

export const FlashcardContent = styled('div')({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
});

export const FlashcardText = styled('p')({
    fontSize: '1.5rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    maxWidth: '90%',
});

// List Layout Styles
export const ListHeader = styled('div')({
    marginBottom: '2rem',
    borderBottom: '0.125rem solid #333',
    paddingBottom: '1rem',
    '& h1': {
        margin: 0,
        fontSize: '2rem',
    },
    '& p': {
        margin: '0.5rem 0 0 0',
        fontSize: '1rem',
        color: '#666',
    },
});

export const ListCard = styled('div')({
    border: '0.0625rem solid #ccc',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1rem',
    pageBreakInside: 'avoid',
    '@media print': {
        pageBreakInside: 'avoid',
    },
});

export const ListCardRow = styled('div')({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
});

export const ListCardColumn = styled('div')({
    '& strong': {
        display: 'block',
        marginBottom: '0.25rem',
        color: '#333',
    },
    '& p': {
        margin: 0,
        fontSize: '1rem',
    },
});

// Grid Layout Styles
export const GridContainer = styled('div')({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))',
    gap: '1rem',
});

export const GridCard = styled('div')({
    border: '0.0625rem solid #ccc',
    borderRadius: '0.25rem',
    padding: '0.75rem',
    fontSize: '0.875rem',
    pageBreakInside: 'avoid',
    '@media print': {
        pageBreakInside: 'avoid',
    },
});

export const GridCardHeader = styled('div')({
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    borderBottom: '0.0625rem solid #ddd',
    paddingBottom: '0.25rem',
});

export const GridCardContent = styled('div')({
    '& > div': {
        marginBottom: '0.25rem',
    },
});

// Shared Components
export const CategoryList = styled('div')({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '1rem',
    '& span': {
        padding: '0.25rem 0.5rem',
        border: '0.0625rem solid #ccc',
        borderRadius: '0.25rem',
        fontSize: '0.875rem',
    },
});

export const CategoryChips = styled('div')({
    marginLeft: 'auto',
    display: 'flex',
    gap: '0.25rem',
    '& span': {
        padding: '0.125rem 0.5rem',
        border: '0.0625rem solid #ccc',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
    },
});

export const NotesList = styled('ul')({
    marginTop: '1rem',
    paddingLeft: '1.5rem',
    '& li': {
        marginBottom: '0.25rem',
    },
});

export const NoteItem = styled('li')({
    fontSize: '0.875rem',
});

export const FileAttachment = styled('img')({
    maxWidth: '100%',
    maxHeight: '15rem',
    marginTop: '1rem',
    objectFit: 'contain',
});

export const FileImage = styled('img')({
    maxWidth: '100%',
    maxHeight: '10rem',
    marginTop: '0.5rem',
    objectFit: 'contain',
});

export const EmptyStateContainer = styled('div')({
    padding: '2rem',
    textAlign: 'center',
});
