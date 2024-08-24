import {
    Chip,
    IconButton,
    ListItem,
    ListItemButton,
    Typography,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import {
    LabelButtons,
    LabelsListContainer,
    LabelsListPaper,
    StyledLabelsList,
    StyledListButton,
} from './styles';
import { TABS } from './constants';
import { Dispatch, SetStateAction } from 'react';

type Props = {
    labels: string[];
    selectedTab: string;
    editIndex?: number | null;
    deleteIndices?: number[];
    handleEditClick?: (index: number) => void;
    handleDeleteClick?: (index: number) => void;
    type?: string;
    currentLabel?: string;
    handleChangeCurrentLabel: (label: string) => void;
    assignLabel: string;
    setAssignLabel: Dispatch<SetStateAction<string>>;
};

const LabelsList = (props: Props) => {
    const {
        assignLabel,
        currentLabel = '',
        deleteIndices = [],
        editIndex = -1,
        handleChangeCurrentLabel = () => {},
        handleDeleteClick = () => {},
        handleEditClick = () => {},
        labels = [],
        selectedTab,
        setAssignLabel,
        type = 'main',
    } = props;

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const listStyle = type === 'main' ? { marginTop: '4rem' } : {};

    const handleListItemClick = (label: string) => {
        if (isCreateTab) {
            const isCurrentLabel = currentLabel === label;
            handleChangeCurrentLabel(isCurrentLabel ? '' : label);
        }
        if (isAssignTab) {
            setAssignLabel(label);
        }
    };

    const renderLabelsList = () => {
        return labels?.map((label: string, index: number) => {
            const isEditSelected = editIndex === index;
            const isDeleteSelected = deleteIndices.includes(index);

            const isCurrentLabel = currentLabel === label;
            const isAssignLabel = assignLabel === label;
            const createLabelSelected = isCreateTab && isCurrentLabel;
            const assignLabelSelected = isAssignTab && isAssignLabel;

            let labelListItemStyling = {};
            let chipLabel = createLabelSelected
                ? 'Current'
                : assignLabelSelected
                  ? 'Selected'
                  : '';
            if (createLabelSelected || assignLabelSelected) {
                labelListItemStyling = {
                    color: 'primary.main',
                };
            }

            return (
                <ListItem
                    disablePadding
                    divider
                    key={index}
                    secondaryAction={
                        isManageTab && (
                            <LabelButtons>
                                <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => handleEditClick(index)}
                                    title="Edit label"
                                >
                                    <Edit
                                        color={
                                            isEditSelected
                                                ? 'primary'
                                                : undefined
                                        }
                                    />
                                </IconButton>
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleDeleteClick(index)}
                                    title="Mark label for deletion"
                                >
                                    <Delete
                                        color={
                                            isDeleteSelected
                                                ? 'primary'
                                                : undefined
                                        }
                                    />
                                </IconButton>
                            </LabelButtons>
                        )
                    }
                    sx={labelListItemStyling}
                >
                    <StyledListButton
                        iscreatetab={`${isCreateTab}`}
                        onClick={() => handleListItemClick(label)}
                    >
                        {label}
                        {(createLabelSelected || assignLabelSelected) && (
                            <Chip
                                label={chipLabel}
                                color="primary"
                                variant="outlined"
                                size="small"
                            />
                        )}
                    </StyledListButton>
                </ListItem>
            );
        });
    };

    return (
        <LabelsListContainer style={listStyle}>
            {/* TODO: Improve styling */}
            <LabelsListPaper elevation={6}>
                <StyledLabelsList>{renderLabelsList()}</StyledLabelsList>
            </LabelsListPaper>
        </LabelsListContainer>
    );
};

export default LabelsList;
