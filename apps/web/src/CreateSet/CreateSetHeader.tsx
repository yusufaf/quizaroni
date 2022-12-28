import { Create, UploadFile } from "@mui/icons-material"
import { FormControl, IconButton, InputLabel, MenuItem, Typography } from "@mui/material"
import { Dispatch, SetStateAction, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BoldHeading, SimpleFlexContainer } from "src/AppStyles"
import { useTheme } from "src/theme/useTheme"
import { CREATE_SET } from "src/utilities/constants"
import {
    CreateSetButton,
    CreateSetContainer,
    CreateSetInputsContainer,
    CreateSetPaper,
    DescriptionInput,
    LabelInput,
    LabelInputContainer,
    LabelSelect,
    TitleInput
} from "./CreateSetStyles"

type Props = {
    setShowImportModal: Dispatch<SetStateAction<boolean>>;
  }; /* use `interface` if exporting so that consumers can extend */

const CreateSetHeader = (props: Props) => {
    const {
        setShowImportModal
    } = props;

    const { theme } = useTheme();
    const navigate = useNavigate();

    const [enteredTitle, setEnteredTitle] = useState("");
    const [enteredDescription, setEnteredDescription] = useState("");
    const [enteredLabel, setEnteredLabel] = useState("");
    const [selectedLabel, setSelectedLabel] = useState("");

    /* TODO: Make sure there's at least one card in the set */
    const createSetDisabled = !enteredTitle || !enteredDescription;



    return (
        <CreateSetPaper elevation={6}>
            <CreateSetContainer>
                <BoldHeading variant="h5">
                    {CREATE_SET.TITLE}
                </BoldHeading>
                <CreateSetInputsContainer>
                    <BoldHeading
                        variant="subtitle1"
                        color={theme.palette.primary.main}
                    >
                        Title
                    </BoldHeading>
                    <TitleInput
                        variant="standard"
                        placeholder={CREATE_SET.TITLE_PLACEHOLDER}
                        // label="Title"
                        value={enteredTitle}
                        onChange={e => setEnteredTitle(e.target.value)}
                        size="small"
                    />
                    <BoldHeading
                        variant="subtitle1"
                        color={theme.palette.primary.main}
                    >
                        Description
                    </BoldHeading>
                    <DescriptionInput
                        variant="outlined"
                        placeholder={CREATE_SET.DESC_PLACEHOLDER}
                        value={enteredDescription}
                        onChange={e => setEnteredDescription(e.target.value)}
                        multiline
                        maxRows={4}
                    />
                    <BoldHeading
                        variant="subtitle1"
                        color={theme.palette.primary.main}
                    >
                        Label
                    </BoldHeading>
                    <LabelInputContainer>
                        <LabelInput
                            variant="standard"
                            size="small"
                            placeholder={CREATE_SET.LABEL_PLACEHOLDER}
                            onChange={e => setEnteredLabel(e.target.value)}
                            disabled={selectedLabel !== ""}
                        />
                        <Typography component="span">or select an existing one</Typography>
                        <FormControl variant="standard">
                            <InputLabel>Label</InputLabel>
                            <LabelSelect
                                value={selectedLabel}
                                // @ts-ignore
                                onChange={(e) => setSelectedLabel(e.target.value)}
                            >
                                {/* TODO: Always leave an empty option so they don't have to pick one */}
                                {/* Width of 10rem for the MenuItem */}
                                <MenuItem value={10} sx={{ width: "10rem" }} >
                                    <Typography variant="inherit" noWrap>
                                        TenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTen
                                    </Typography>
                                </MenuItem>
                            </LabelSelect>
                        </FormControl>
                        {/* TODO: Map labelOptions to MenuItem */}
                    </LabelInputContainer>
                    <CreateSetButton
                        variant="contained"
                        onClick={() => createNewSet()}
                        size="large"
                        disabled={createSetDisabled}
                        startIcon={<Create />}
                    >
                        Create Set
                    </CreateSetButton>
                </CreateSetInputsContainer>
                <SimpleFlexContainer>
                    <IconButton
                        onClick={() => setShowImportModal(true)}
                    >
                        <UploadFile
                            fontSize="large"
                        />
                    </IconButton>
                    <Typography>
                        Import Cards
                    </Typography>
                </SimpleFlexContainer>
            </CreateSetContainer>
        </CreateSetPaper>
    )
}

export default CreateSetHeader