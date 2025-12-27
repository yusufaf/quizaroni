import { ArrowBack, Create } from '@mui/icons-material';
import { Button, Typography, Autocomplete, TextField, Chip } from '@mui/material';
import { BoldTypography } from 'styles/AppStyles';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import HeaderAdvancedSection from './HeaderAdvancedSection';
import {
    CreateSetInputsContainer,
    CreateSetPaper,
    DescriptionInput,
    HeaderContainer,
    HeaderLeft,
    HeaderRight,
    TitleInput,
    BackToViewButton,
} from './CreateSetStyles';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetUser } from 'state/api/usersAPI';

type Props = {
    advancedSectionProps: any;
    saveChanges: () => void;
    mainButtonDisabled: boolean;
    description: string;
    labels: string[];
    onDescriptionChange: any;
    onLabelsChange: (labels: string[]) => void;
    onTitleChange: any;
    title: string;
};

const CreateSetHeader = ({
    advancedSectionProps,
    description,
    labels: selectedLabels,
    mainButtonDisabled,
    onDescriptionChange,
    onLabelsChange,
    onTitleChange,
    saveChanges,
    title,
}: Props) => {
    const navigate = useNavigate();
    const { id: studySetUUID } = useParams();

    const { data: { user: { labels: userLabels = [] } } = DEFAULT_USER_RESPONSE } =
        useGetUser();

    const handleBackToViewing = () => {
        navigate(`/view/${studySetUUID}`);
    };

    return (
        <CreateSetPaper elevation={6}>
            <HeaderContainer>
                <HeaderLeft>
                    <BackToViewButton
                        onClick={handleBackToViewing}
                        startIcon={<ArrowBack color="primary" />}
                    >
                        Back to Viewing Study Set
                    </BackToViewButton>
                    <BoldTypography variant="h5">
                        Edit your study set
                    </BoldTypography>
                    <CreateSetInputsContainer>
                        <div>
                            <BoldTypography variant="subtitle1">
                                Title *
                            </BoldTypography>
                            <TitleInput
                                variant="standard"
                                placeholder={'Enter a title for your study set'}
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
                                placeholder={
                                    'Enter a description for your study set'
                                }
                                value={description}
                                onChange={onDescriptionChange}
                                multiline
                                rows={3}
                            />
                        </div>
                        <div>
                            <BoldTypography variant="subtitle1">
                                Labels
                            </BoldTypography>
                            <Autocomplete
                                multiple
                                freeSolo
                                options={userLabels}
                                value={selectedLabels}
                                onChange={(_event, newValue) => {
                                    // Soft limit warning at 10 labels
                                    if (newValue.length > 10) {
                                        console.warn('Consider using fewer than 10 labels for better organization');
                                    }
                                    onLabelsChange(newValue);
                                }}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={option}
                                            size="small"
                                            {...getTagProps({ index })}
                                            key={index}
                                        />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        variant="outlined"
                                        placeholder={selectedLabels.length === 0 ? "Add labels..." : ""}
                                        size="small"
                                    />
                                )}
                                sx={{ width: '100%', maxWidth: '40rem' }}
                            />
                        </div>
                    </CreateSetInputsContainer>
                </HeaderLeft>
                <HeaderRight>
                    <Button
                        variant="contained"
                        onClick={() => saveChanges()}
                        size="large"
                        disabled={mainButtonDisabled}
                        startIcon={<Create />}
                    >
                        Save Changes
                    </Button>
                    <HeaderAdvancedSection {...advancedSectionProps} />
                </HeaderRight>
            </HeaderContainer>
        </CreateSetPaper>
    );
};

export default CreateSetHeader;
