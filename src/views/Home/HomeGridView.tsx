import React, { useEffect, useState } from 'react';
import { Pagination } from '@mui/material';
import { CenteredTypography, HomeSetGrid } from './HomeStyles';
import { Studyset } from 'shared/types';
import HomeStudySetCard from './HomeStudySetCard';

type Props = {
    studysets: Studyset[];
};

const cardsPerPage = 6;

const HomeGridView = ({ studysets }: Props) => {
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

    return (
        <>
            <HomeSetGrid>
                {paginatedStudySets.length === 0 ? (
                    <CenteredTypography>No results found</CenteredTypography>
                ) : (
                    paginatedStudySets.map((studyset) => (
                        <HomeStudySetCard
                            key={studyset.uuid}
                            studyset={studyset}
                        />
                    ))
                )}
            </HomeSetGrid>
            <Pagination onChange={onPageChange} count={numPages} page={page} />
        </>
    );
};

export default HomeGridView;
