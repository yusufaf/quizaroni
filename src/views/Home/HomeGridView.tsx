import React, { useEffect, useState } from 'react';
import { Box, Button, Pagination, Skeleton, Typography } from '@mui/material';
import { Add, SearchOff } from '@mui/icons-material';
import { CenteredTypography, HomeSetGrid } from './HomeStyles';
import { Studyset } from 'shared/types';
import HomeStudySetCard from './HomeStudySetCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type Props = {
    studysets: Studyset[];
    isLoading?: boolean;
};

const cardsPerPage = 6;

const HomeGridView = ({ studysets, isLoading = false }: Props) => {
    const navigate = useNavigate();
    const [page, setPage] = useState<number>(1);

    const onPageChange = (
        _event: React.ChangeEvent<unknown>,
        value: number
    ) => {
        setPage(value);
    };

    const numPages = Math.ceil(studysets.length / cardsPerPage);

    // Paginate the study sets
    const paginatedStudySets = studysets.slice(
        (page - 1) * cardsPerPage,
        page * cardsPerPage
    );

    if (isLoading) {
        return (
            <HomeSetGrid>
                {Array.from({ length: 6 }).map((_, index) => (
                    <Box key={index} sx={{ padding: '1.25rem' }}>
                        <Skeleton variant="rectangular" height="15rem" sx={{ borderRadius: '0.75rem' }} />
                    </Box>
                ))}
            </HomeSetGrid>
        );
    }

    if (paginatedStudySets.length === 0 && studysets.length === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.5rem',
                    padding: '4rem 2rem',
                }}
            >
                <SearchOff sx={{ fontSize: '4rem', opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary">
                    No study sets yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '30rem', textAlign: 'center' }}>
                    Get started by creating your first study set! Add flashcards, organize them, and start learning.
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/create')}
                    size="large"
                >
                    Create Your First Study Set
                </Button>
            </Box>
        );
    }

    if (paginatedStudySets.length === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    padding: '3rem 2rem',
                }}
            >
                <SearchOff sx={{ fontSize: '3rem', opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary">
                    No results found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or filters
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <HomeSetGrid>
                <AnimatePresence mode="wait">
                    {paginatedStudySets.map((studyset, index) => (
                        <motion.div
                            key={studyset.uuid}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                        >
                            <HomeStudySetCard studyset={studyset} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </HomeSetGrid>
            <Pagination onChange={onPageChange} count={numPages} page={page} />
        </>
    );
};

export default HomeGridView;
