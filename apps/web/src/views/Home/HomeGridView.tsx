import React, { useState } from "react";
import { Pagination } from "@mui/material";
import { HomeSetGrid } from "./HomeStyles";
import { Studyset } from "lib/types";
import HomeStudySetCard from "./HomeStudySetCard/HomeStudySetCard";

type Props = {
    studySets: Studyset[];
};

const cardsPerPage = 6;

const HomeGridView = (props: Props) => {
    const { studySets } = props;

    const [page, setPage] = useState<number>(1);

    const onPageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    return (
        <HomeSetGrid>
            {studySets.map((studySet) => (
                <HomeStudySetCard key={studySet.uuid} studySet={studySet} />
            ))}
            <Pagination 
                onChange={onPageChange}
                count={Math.ceil(studySets.length / cardsPerPage)}
                page={page}
            />
        </HomeSetGrid>
    );
};

export default HomeGridView;
