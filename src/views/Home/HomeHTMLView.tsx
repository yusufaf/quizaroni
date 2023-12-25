import { Studyset } from "lib/types";
import { HTML_TABLE_HEADERS } from "utilities/constants";
import {
    HomeHTMLTableWrapper,
    HomeHTMLTable,
    HTMLTableThead,
} from "./HomeStyles";
import { IconButton } from "@mui/material";
import { MoreHoriz } from "@mui/icons-material";
import { useState } from "react";
import SetActionsMenu from "./SetActionsMenu";

type Props = {
    studysets: Studyset[];
    handleShowConfirmDialog: any;
};

const HomeHTMLView = (props: Props) => {
    const { studysets, handleShowConfirmDialog } = props;

    const [localSelectedStudyset, setLocalSelectedStudyset] =
        useState<Studyset | null>(null);
    const [actionsMenuOpen, setActionsMenuOpen] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const openActionsMenu = (
        event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
        studyset: Studyset
    ) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
        setLocalSelectedStudyset(studyset);
    };

    const closeActionsMenu = () => {
        setAnchorEl(null);
        setActionsMenuOpen(false);
    };

    return (
        <>
            <HomeHTMLTableWrapper>
                <HomeHTMLTable>
                    <HTMLTableThead>
                        <tr>
                            {HTML_TABLE_HEADERS.map((value) => (
                                <th>{value}</th>
                            ))}
                        </tr>
                    </HTMLTableThead>
                    <tbody>
                        {studysets.map((studyset) => {
                            return (
                                <tr>
                                    <td>{studyset.title}</td>
                                    <td>{studyset.description}</td>
                                    <td>
                                        {new Date(
                                            studyset.createdAt
                                        ).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {new Date(
                                            studyset.lastViewed
                                        ).toLocaleDateString()}
                                    </td>
                                    <td>{studyset.cards.length}</td>
                                    <td>
                                        {studyset.label
                                            ? studyset.label
                                            : "No label"}
                                    </td>
                                    <td>{studyset.favorited ? "✅" : "❌"}</td>
                                    <td>
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openActionsMenu(e, studyset);
                                            }}
                                            sx={{
                                                height: "2rem",
                                                width: "2rem",
                                            }}
                                        >
                                            <MoreHoriz />
                                        </IconButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </HomeHTMLTable>
            </HomeHTMLTableWrapper>
            <SetActionsMenu
                studyset={localSelectedStudyset}
                open={actionsMenuOpen}
                onClose={closeActionsMenu}
                anchorEl={anchorEl}
                handleShowConfirmDialog={handleShowConfirmDialog}
            />
        </>
    );
};

export default HomeHTMLView;
