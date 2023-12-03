import {
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
} from "@mui/material";
import { Studyset } from "lib/types";
import { LabelInputsContainer, SelectChipsContainer } from "./styles";
import { Dispatch, SetStateAction } from "react";

type Props = {
    studysets: Studyset[];
    selectedStudysetUUIDs: string[];
    setSelectedStudysetUUIDs: Dispatch<SetStateAction<string[]>>;
};

const AssignTabView = (props: Props) => {
    const {
        studysets,
        selectedStudysetUUIDs = [],
        setSelectedStudysetUUIDs,
    } = props;

    const handleChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value },
        } = event;
        setSelectedStudysetUUIDs(value as string[]);
    };

    return (
        <LabelInputsContainer>
            <FormControl fullWidth>
                <InputLabel id="studysets-select-label">Studysets to Assign Label To</InputLabel>
                <Select
                    labelId="studysets-select-label"
                    label="Studysets to Assign Label To"
                    multiple
                    onChange={handleChange}
                    value={selectedStudysetUUIDs}
                    renderValue={(selectedUUIDs) => (
                        <SelectChipsContainer>
                            {selectedUUIDs.map((uuid) => (
                                <Chip
                                    key={uuid}
                                    label={
                                        studysets.find(
                                            (value) => value.uuid === uuid
                                        )?.title ?? ""
                                    }
                                />
                            ))}
                        </SelectChipsContainer>
                    )}
                >
                    {studysets.map((studyset, index) => {
                        const text = studyset.title;
                        return (
                            <MenuItem
                                key={studyset.uuid}
                                value={studyset.uuid}
                                title={text}
                            >
                                <Typography
                                    variant="inherit"
                                    noWrap
                                    title={text}
                                >
                                    {text}
                                </Typography>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
        </LabelInputsContainer>
    );
};

export default AssignTabView;
