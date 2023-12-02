import {
    Chip,
    IconButton,
    ListItem,
    ListItemButton,
    Typography,
} from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import {
    LabelButtons,
    LabelsListContainer,
    LabelsListPaper,
    StyledLabelsList,
    StyledListButton,
} from "./styles";
import { TABS } from "./constants";

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
};

const LabelsList = (props: Props) => {
    const {
        labels = [],
        selectedTab,
        editIndex = -1,
        deleteIndices = [],
        handleEditClick = () => {},
        handleDeleteClick = () => {},
        type = "main",
        currentLabel = "",
        handleChangeCurrentLabel = () => {},
    } = props;

    const isChangeTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const listStyle = type === "main" ? { marginTop: "4rem" } : {};

    const renderLabelsList = () => {
        return labels?.map((label: string, index: number) => {
            const isEditSelected = editIndex === index;
            const isDeleteSelected = deleteIndices.includes(index);

            const isCurrentLabel = currentLabel === label;

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
                                                ? "primary"
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
                                                ? "primary"
                                                : undefined
                                        }
                                    />
                                </IconButton>
                            </LabelButtons>
                        )
                    }
                    sx={{
                        color: isCurrentLabel ? "primary.main" : "",
                    }}
                >
                    <StyledListButton
                        isChangeTab={isChangeTab}
                        onClick={() => handleChangeCurrentLabel(label)}
                    >
                        {label}
                        {isCurrentLabel && (
                            <Chip
                                label={"Current"}
                                color="primary"
                                variant="outlined"
                                size="small"
                                sx={{ marginLeft: "0.5rem" }}
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
