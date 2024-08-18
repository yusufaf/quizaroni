import { ArrowBack, Create } from '@mui/icons-material';
import { Button, FormControl, Typography } from '@mui/material';
import { BoldTypography } from 'common/AppStyles';
import { DEFAULT_USER_RESPONSE } from 'utilities/constants';
import HeaderAdvancedSection from './HeaderAdvancedSection';
import {
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
} from './CreateSetStyles';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetUserQuery } from 'state/api/usersAPI';
import { ReactElement } from 'react';

type Props = {
    advancedSectionProps: any;
    saveChanges: () => void;
    mainButtonDisabled: boolean;
    description: string;
    label: string | null;
    onDescriptionChange: any;
    onLabelChange: any;
    onSelectedLabelChange: any;
    onTitleChange: any;
    selectedLabel: string;
    title: string;
};

const CreateSetHeader = ({
    advancedSectionProps,
    description,
    label,
    mainButtonDisabled,
    onDescriptionChange,
    onLabelChange,
    onSelectedLabelChange,
    onTitleChange,
    saveChanges,
    selectedLabel,
    title,
}: Props) => {
    const navigate = useNavigate();
    const { id: studySetUUID } = useParams();

    const { data: { user: { labels = [] } } = DEFAULT_USER_RESPONSE } =
        useGetUserQuery();

    const renderLabelOptions = () => {
        const labelJsx: ReactElement[] = [];

        labelJsx.push(
            <LabelMenuItem key="" value="" sx={{ width: '10rem' }}>
                <Typography variant="inherit" noWrap color="primary">
                    None
                </Typography>
            </LabelMenuItem>
        );

        labelJsx.push(
            ...labels.map((label, index: number) => {
                return (
                    <LabelMenuItem
                        key={index}
                        value={label}
                        sx={{ width: '10rem' }}
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
    };

    return (
        <CreateSetPaper elevation={6}>
            <HeaderContainer>
                <HeaderLeft>
                    <BackToViewButton
                        onClick={handleBackClick}
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
                                Label
                            </BoldTypography>
                            <LabelInputContainer>
                                <LabelInput
                                    variant="standard"
                                    size="small"
                                    placeholder={
                                        'Enter a label for your new study set'
                                    }
                                    value={label}
                                    onChange={onLabelChange}
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
