import { IconButton, ListItem, Typography } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import {
    StyledCategoriesList,
    CategoriesListContainer,
    CategoriesListPaper,
    CategoryButtons,
} from "./styles";
import { TABS } from "./constants";

type Props = {
    categories: string[];
    selectedTab: string;
    editIndex?: number | null;
    deleteIndices?: number[];
    handleEditClick?: (index: number) => void;
    handleDeleteClick?: (index: number) => void;
    type?: string;
};

const CategoriesList = (props: Props) => {
    const {
        categories = [],
        selectedTab,
        editIndex = -1,
        deleteIndices = [],
        handleEditClick = () => {},
        handleDeleteClick = () => {},
        type = "main",
    } = props;

    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const listStyle = type === "main" ? { marginTop: "4rem" } : {};

    const renderCategoriesList = () => {
        return categories?.map((value, index) => {
            const isEditSelected = editIndex === index;
            const isDeleteSelected = deleteIndices.includes(index);

            return (
                <ListItem
                    divider
                    key={index}
                    secondaryAction={
                        isManageTab && (
                            <CategoryButtons>
                                <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => handleEditClick(index)}
                                    title="Edit category"
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
                                    title="Mark category for deletion"
                                >
                                    <Delete
                                        color={
                                            isDeleteSelected
                                                ? "primary"
                                                : undefined
                                        }
                                    />
                                </IconButton>
                            </CategoryButtons>
                        )
                    }
                >
                    {value}
                </ListItem>
            );
        });
    };

    return (
        <CategoriesListContainer style={listStyle}>
            {/* TODO: Improve styling */}
            {categories.length === 0 ? (
                <Typography variant="h6">No categories to import</Typography>
            ) : (
                <CategoriesListPaper elevation={6}>
                    <StyledCategoriesList>
                        {renderCategoriesList()}
                    </StyledCategoriesList>
                </CategoriesListPaper>
            )}
        </CategoriesListContainer>
    );
};

export default CategoriesList;
