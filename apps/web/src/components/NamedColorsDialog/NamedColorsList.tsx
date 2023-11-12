import { IconButton, ListItem, Typography } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import {
    StyledColorsList,
    ColorsListContainer,
    ColorsListPaper,
    ColorButtonsContainer,
} from "./styles";
import { TABS } from "./constants";

type Props = {
    namedColors: {color: string; name: string }[];
    selectedTab: string;
    editIndex?: number | null;
    deleteIndices?: number[];
    handleEditClick?: (index: number) => void;
    handleDeleteClick?: (index: number) => void;
    style?: Object;
};

const NamedColorsList = (props: Props) => {
    const {
        namedColors = [],
        selectedTab,
        editIndex = -1,
        deleteIndices = [],
        handleEditClick = () => {},
        handleDeleteClick = () => {},
        style = {},
    } = props;

    const isManageTab = selectedTab === TABS.MANAGE;

    const renderNamedColorsList = () => {
        return namedColors?.map((value, index) => {
            const { color, name } = value;
            const isEditSelected = editIndex === index;
            const isDeleteSelected = deleteIndices.includes(index);

            return (
                <ListItem
                    divider
                    key={index}
                    secondaryAction={
                        isManageTab && (
                            <ColorButtonsContainer>
                                <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => handleEditClick(index)}
                                    title="Edit named color"
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
                                    title="Mark named color for deletion"
                                >
                                    <Delete
                                        color={
                                            isDeleteSelected
                                                ? "primary"
                                                : undefined
                                        }
                                    />
                                </IconButton>
                            </ColorButtonsContainer>
                        )
                    }
                >
                    {name}
                    {color}
                </ListItem>
            );
        });
    };

    return (
        <ColorsListContainer style={style}>
            {namedColors.length === 0 ? (
                <Typography variant="subtitle1">No named colors to display</Typography>
            ) : (
                <ColorsListPaper elevation={6}>
                    <StyledColorsList>
                        {renderNamedColorsList()}
                    </StyledColorsList>
                </ColorsListPaper>
            )}
        </ColorsListContainer>
    );
};

export default NamedColorsList;
