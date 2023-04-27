import { Create, UploadFile } from "@mui/icons-material";
import {
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Typography,
} from "@mui/material";
import { Dispatch, SetStateAction } from "react";
import { BoldHeading, SimpleFlexContainer } from "src/AppStyles";
import { useTheme } from "src/theme/useTheme";
import { CREATE_SET } from "src/utilities/constants";
import {
    CreateSetButton,
    CreateSetContainer,
    CreateSetInputsContainer,
    CreateSetPaper,
    DescriptionInput,
    HeaderLeftContainer,
    HeaderRightContainer,
    LabelInput,
    LabelInputContainer,
    LabelSelect,
    TitleInput,
} from "./CreateSetStyles";
import HeaderAdvancedSection from "./HeaderAdvancedSection";

type Props = {
    advancedSectionProps: any;
    createNewSet: any;
    onDescriptionChange: any;
    onLabelChange: any;
    onSelectedLabelChange: any;
    onTitleChange: any;
    description: string;
    label: string;
    selectedLabel: string;
    title: string;
    setShowImportModal: Dispatch<SetStateAction<boolean>>;
}; /* use `interface` if exporting so that consumers can extend */

const CreateSetHeader = (props: Props) => {
    const {
        advancedSectionProps,
        createNewSet,
        description,
        label,
        onDescriptionChange,
        onLabelChange,
        onSelectedLabelChange,
        onTitleChange,
        selectedLabel,
        setShowImportModal,
        title,
    } = props;

    const { theme } = useTheme();

    /* TODO: Make sure there's at least one card in the set ? */
    const createSetDisabled = !title || !description;

    return (
        <CreateSetPaper elevation={6}>
            <CreateSetContainer>
                <HeaderLeftContainer>
                    <BoldHeading variant="h5">{CREATE_SET.TITLE}</BoldHeading>
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
                            value={title}
                            onChange={onTitleChange}
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
                            value={description}
                            onChange={onDescriptionChange}
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
                                onChange={onLabelChange}
                                disabled={selectedLabel !== ""}
                            />
                            <Typography component="span">
                                or select an existing one
                            </Typography>
                            <FormControl variant="standard">
                                <InputLabel>Label</InputLabel>
                                <LabelSelect
                                    value={selectedLabel}
                                    onChange={onSelectedLabelChange}
                                >
                                    {/* TODO: Always leave an empty option so they don't have to pick one */}
                                    {/* Width of 10rem for the MenuItem */}
                                    <MenuItem
                                        value={10}
                                        sx={{ width: "10rem" }}
                                    >
                                        <Typography variant="inherit" noWrap>
                                            TenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTen
                                        </Typography>
                                    </MenuItem>
                                </LabelSelect>
                            </FormControl>
                            {/* TODO: Map labelOptions to MenuItem */}
                        </LabelInputContainer>
                    </CreateSetInputsContainer>
                    <SimpleFlexContainer>
                        <Button
                            variant="outlined"
                            startIcon={<UploadFile fontSize="large" />}
                            onClick={() => setShowImportModal(true)}
                        >
                            Import Cards
                        </Button>
                    </SimpleFlexContainer>
                </HeaderLeftContainer>
                <HeaderRightContainer>
                    <CreateSetButton
                        variant="contained"
                        onClick={() => createNewSet()}
                        size="large"
                        disabled={createSetDisabled}
                        startIcon={<Create />}
                    >
                        Create Set
                    </CreateSetButton>
                    <HeaderAdvancedSection {...advancedSectionProps} />
                </HeaderRightContainer>
            </CreateSetContainer>
        </CreateSetPaper>
    );
};

export default CreateSetHeader;
