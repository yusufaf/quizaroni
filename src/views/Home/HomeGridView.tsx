import React, { useEffect, useState } from "react";
import { Pagination } from "@mui/material";
import { HomeSetGrid } from "./HomeStyles";
import { Studyset } from "lib/types";
import HomeStudySetCard from "./HomeStudySetCard/HomeStudySetCard";

type Props = {
    studysets: Studyset[];
    handleShowConfirmDialog: any;
};

const cardsPerPage = 6;

const HomeGridView = (props: Props) => {
    const { studysets, handleShowConfirmDialog } = props;

    const [page, setPage] = useState<number>(1);

    const onPageChange = (event: React.ChangeEvent<unknown>, value: number) => {
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
                {paginatedStudySets.map((studyset) => (
                    <HomeStudySetCard 
                        key={studyset.uuid} 
                        studyset={studyset} 
                        handleShowConfirmDialog={handleShowConfirmDialog}
                    />
                ))}
            </HomeSetGrid>
            <Pagination onChange={onPageChange} count={numPages} page={page} />
        </>
    );
};

export default HomeGridView;
