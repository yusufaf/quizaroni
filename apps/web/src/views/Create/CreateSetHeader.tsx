import { ArrowBack, Create } from "@mui/icons-material";
import {
    Button,
    FormControl,
    Typography
} from "@mui/material";
import { BoldTypography } from "common/AppStyles";
import { useSelector } from "react-redux";
import { selectCognitoUser } from "state/slices/globalSlice";
import { useTheme } from "theme/useTheme";
import {
    CREATE_PAGE_PROPS,
    CREATE_PAGE_TYPES,
    CREATE_SET,
    DEFAULT_USER_DATA
} from "utilities/constants";
import HeaderAdvancedSection from "./HeaderAdvancedSection";
import {
    PageMainButton,
    CreateSetInputsContainer,
    CreateSetPaper,
    DescriptionInput,
    HeaderContainer,
    HeaderLeft,
    HeaderRight,
    LabelInput,
    LabelInputContainer,
    LabelMenuItem,
    LabelSelect,
    TitleInput,
    BackToViewButton,
} from "./CreateSetStyles";
import { useNavigate, useParams } from "react-router-dom";
import { useGetUserQuery } from "state/api/usersAPI";

type Props = {
    advancedSectionProps: any;
    handleMainButton: any;
    mainButtonDisabled: boolean;
    description: string;
    label: string | null;
    onDescriptionChange: any;
    onLabelChange: any;
    onSelectedLabelChange: any;
    onTitleChange: any;
    pageType: string;
    selectedLabel: string;
    title: string;
};

const CreateSetHeader = (props: Props) => {
    const {
        advancedSectionProps,
        handleMainButton,
        description,
        label,
        onDescriptionChange,
        onLabelChange,
        onSelectedLabelChange,
        onTitleChange,
        selectedLabel,
        title,
        pageType = "",
        mainButtonDisabled,
    } = props;

    const isEditPage = pageType === CREATE_PAGE_TYPES.EDIT;

    const { theme } = useTheme();
    const navigate = useNavigate();
    const { id: studySetUUID } = useParams();

    const cognitoUser = useSelector(selectCognitoUser);
    const {
        data: {
            labels = []
        } = DEFAULT_USER_DATA,
    } = useGetUserQuery({
        username: cognitoUser.username ?? "",
    });

    const renderLabelOptions = () => {
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

    const handleBackClick = () => {
        navigate(`/view/${studySetUUID}`);
    }

    return (
        <CreateSetPaper elevation={6}>
            <HeaderContainer>
                <HeaderLeft>
                    {isEditPage && (
                        <BackToViewButton
                            onClick={handleBackClick}
                            startIcon={<ArrowBack color="primary" />}
                        >
                            Back to Study Set
                        </BackToViewButton>
                    )}
                    <BoldTypography variant="h5">
                        {CREATE_PAGE_PROPS[pageType].TITLE}
                    </BoldTypography>
                    <CreateSetInputsContainer>
                        <div>
                            <BoldTypography variant="subtitle1">
                                Title *
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
                                rows={3}
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
                                    value={label}
                                    onChange={onLabelChange}
                                />
                                <Typography component="span">
                                    or select an existing one
                                </Typography>
                                <FormControl 
                                    variant="standard"
                                >
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
                    <PageMainButton
                        variant="contained"
                        onClick={() => handleMainButton()}
                        size="large"
                        disabled={mainButtonDisabled}
                        startIcon={<Create />}
                    >
                        {CREATE_PAGE_PROPS[pageType].BUTTON}
                    </PageMainButton>
                    <HeaderAdvancedSection {...advancedSectionProps} />
                </HeaderRight>
            </HeaderContainer>
        </CreateSetPaper>
    );
};

export default CreateSetHeader;
