import { useMemo } from "react";
import { Studyset } from "lib/types";

type UseFilterStudysetsParams = {
    searchText: string;
    studysets: Studyset[];
};

export default function useFilterStudysets(props: UseFilterStudysetsParams): Studyset[] {
    const { searchText, studysets } = props;

    const searchedStudysets = useMemo(() => {
        if (searchText === "") {
            return [...studysets];
        }
        const searchTextLower = searchText.toLowerCase();
        const localSearchedStudysets = [...studysets].filter((value) =>
            value.title.toLowerCase().includes(searchTextLower)
        );
        return localSearchedStudysets;
    }, [searchText, studysets]);

    return searchedStudysets;
}
