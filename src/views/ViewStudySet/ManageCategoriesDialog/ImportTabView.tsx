import { Dispatch, SetStateAction } from "react";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { Studyset } from "lib/types";
import {
    CategoryFormControl,
    CategoryInputsContainer,
    StyledMenuItem,
} from "./styles";
import { InputLabel, Typography } from "@mui/material";
import CategoriesList from "./CategoriesList";
import { TABS } from "./constants";

type Props = {
    selectedStudyset: Studyset;
    setSelectedStudysetUUID: Dispatch<SetStateAction<string>>;
    selectedStudysetUUID: string;
    studysets: Studyset[];
};

const ImportTabView = (props: Props) => {
    const {
        selectedStudyset,
        setSelectedStudysetUUID,
        selectedStudysetUUID,
        studysets,
    } = props;

    const handleChange = (event: SelectChangeEvent) => {
        setSelectedStudysetUUID(event.target.value as string);
    };

    const filteredStudySets = studysets.filter(
        (set) => set.uuid !== selectedStudyset.uuid
    );
    const importSetCategories =
        filteredStudySets.find(
            (studySet) => studySet.uuid === selectedStudysetUUID
        )?.categories ?? [];

    return (
        <CategoryInputsContainer>
            <CategoryFormControl fullWidth>
                <InputLabel id="study-set-select-label">Study Set</InputLabel>
                <Select
                    labelId="study-set-select-label"
                    label="Study Set"
                    value={selectedStudysetUUID}
                    onChange={handleChange}
                >
                    {filteredStudySets.map((studySet, index) => (
                        <StyledMenuItem
                            key={studySet.uuid}
                            value={studySet.uuid}
                        >
                            <Typography
                                variant="inherit"
                                noWrap
                                title={studySet.title}
                            >
                                {studySet.title}
                            </Typography>
                        </StyledMenuItem>
                    ))}
                </Select>
            </CategoryFormControl>
            <Typography variant="caption">
                Categories from the selected study set will be imported into
                this study set. Duplicates will be ignored.
            </Typography>
            {selectedStudysetUUID && (
                <CategoriesList
                    categories={importSetCategories}
                    selectedTab={TABS.IMPORT}
                    type={TABS.IMPORT}
                />
            )}
        </CategoryInputsContainer>
    );
};

export default ImportTabView;
