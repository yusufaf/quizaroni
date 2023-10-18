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
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import { useTheme } from "theme/useTheme";
import {
    CREATE_SET,
    CREATE_PAGE_TYPES,
    CREATE_PAGE_PROPS,
} from "utilities/constants";
import {
    CreateSetButton,
    HeaderContainer,
    CreateSetInputsContainer,
    CreateSetPaper,
    DescriptionInput,
    HeaderLeft,
    HeaderRight,
    LabelInput,
    LabelInputContainer,
    LabelMenuItem,
    LabelSelect,
    TitleInput,
} from "./createSetStyles";
import HeaderAdvancedSection from "./HeaderAdvancedSection";
import { useSelector } from "react-redux";
import { selectUserData } from "state/slices/global";

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
    pageType: string;
    createSetDisabled: boolean;
};

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
        title,
        pageType = "",
        createSetDisabled,
    } = props;

    const { theme } = useTheme();

    const userData = useSelector(selectUserData);

    const renderLabelOptions = () => {
        const { labels = [] } = userData;
        const labelJsx: any[] = [];

        labelJsx.push(
            <LabelMenuItem key="" value="" sx={{ width: "10rem" }}>
                <Typography variant="inherit" noWrap color="primary">
                    None
                </Typography>
            </LabelMenuItem>
        );

        labelJsx.push(
            ...labels.map((label: any, index: number) => {
                return (
                    <LabelMenuItem
                        key={index}
                        value={label}
                        sx={{ width: "10rem" }}
                        title={label}
                    >
                        <Typography variant="inherit" noWrap>
                            {label}
                        </Typography>
                    </LabelMenuItem>
                );
            })
        );
        return labelJsx;
    };

    return (
        <CreateSetPaper elevation={6}>
            <HeaderContainer>
                <HeaderLeft>
                    <BoldTypography variant="h5">
                        {CREATE_PAGE_PROPS[pageType].TITLE}
                    </BoldTypography>
                    <CreateSetInputsContainer>
                        <div>
                            <BoldTypography variant="subtitle1">
                                Title
                            </BoldTypography>
                            <TitleInput
                                variant="standard"
                                placeholder={CREATE_SET.TITLE_PLACEHOLDER}
                                value={title}
                                onChange={onTitleChange}
                                size="small"
                            />
                        </div>
                        <div>
                            <BoldTypography variant="subtitle1">
                                Description
                            </BoldTypography>
                            <DescriptionInput
                                variant="outlined"
                                placeholder={CREATE_SET.DESC_PLACEHOLDER}
                                value={description}
                                onChange={onDescriptionChange}
                                multiline
                                maxRows={4}
                            />
                        </div>
                        <div>
                            <BoldTypography variant="subtitle1">
                                Label
                            </BoldTypography>
                            <LabelInputContainer>
                                <LabelInput
                                    variant="standard"
                                    size="small"
                                    placeholder={
                                        "Enter a label for your new study set"
                                    }
                                    onChange={onLabelChange}
                                    disabled={selectedLabel !== ""}
                                />
                                <Typography component="span">
                                    or select an existing one
                                </Typography>
                                <FormControl variant="standard">
                                    <LabelSelect
                                        value={selectedLabel}
                                        onChange={onSelectedLabelChange}
                                    >
                                        {renderLabelOptions()}
                                    </LabelSelect>
                                </FormControl>
                            </LabelInputContainer>
                        </div>
                    </CreateSetInputsContainer>
                </HeaderLeft>
                <HeaderRight>
                    <CreateSetButton
                        variant="contained"
                        onClick={() => createNewSet()}
                        size="large"
                        disabled={createSetDisabled}
                        startIcon={<Create />}
                    >
                        {CREATE_PAGE_PROPS[pageType].BUTTON}
                    </CreateSetButton>
                    <HeaderAdvancedSection {...advancedSectionProps} />
                </HeaderRight>
            </HeaderContainer>
        </CreateSetPaper>
    );
};

export default CreateSetHeader;
