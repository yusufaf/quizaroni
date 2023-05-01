import { MoreHoriz } from '@mui/icons-material/';
import {
    IconButton,
    Typography
} from '@mui/material/';
import { useState } from "react";
import ConfirmDialog from "components/ConfirmDialog/ConfirmDialog";
import { useTheme } from "theme/useTheme";
import {
    CardBottom,
    CardContent,
    CardDesc,
    CardInfo,
    CardTitle,
    HomeSetCard,
    LabelChip,
    SpacedContainer,
    TermsLabel
} from "../HomeStyles";
import SetActionsMenu from "../SetActionsMenu";
import { useDispatch } from 'react-redux';
import { setSelectedStudySet } from 'state/slices/studysetsSlice';
import { useNavigate } from 'react-router-dom';

type Props = {
    studySet: any;
    handleDeleteSet: any;
}

const HomeStudySetCard = (props: Props) => {
    const {
        studySet,
        handleDeleteSet,
    } = props;

    const {
        cards,
        createdAt,
        title,
        description,
        label,
        lastViewed,
        uuid,
    } = studySet;

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);

    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(false);

    const onCardClick = () => {
        dispatch(setSelectedStudySet(studySet));
        navigate(`/view/${uuid}`);
    }

    const handleShowDeleteConfirmation = () => {
        setShowDeleteConfirmation(true);
    }

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
    }

    const openActionsMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
    }

    const closeActionsMenu = () => {
        setAnchorEl(null)
        setActionsMenuOpen(false);
    }

    const actionMenuProps = {
        studyset: studySet,
        open: actionsMenuOpen,
        onClose: closeActionsMenu,
        anchorEl: anchorEl,
        handleShowDeleteConfirmation,
    }

    return (
        <>
            <HomeSetCard
                raised
                onClick={onCardClick}
            >
                <CardContent>
                    <CardTitle 
                        title={title}
                        variant="h6"
                    >
                        {title}
                    </CardTitle>
                    <CardDesc>
                        {description}
                    </CardDesc>
                    <CardInfo>
                        <TermsLabel>{cards.length} Terms</TermsLabel>
                        <SpacedContainer>
                            <Typography>Date Created</Typography>
                            <Typography>{new Date(createdAt).toLocaleDateString()}</Typography>
                        </SpacedContainer>
                        <SpacedContainer>
                            <Typography>Last viewed</Typography>
                            <Typography>{new Date(lastViewed).toLocaleDateString()}</Typography>
                        </SpacedContainer>
                    </CardInfo>
                    <CardBottom>
                        <LabelChip label={label ? label : "No label selected"} variant="outlined" />
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation();
                                openActionsMenu(e)
                            }}
                        >
                            <MoreHoriz />
                        </IconButton>
                        <SetActionsMenu
                            {...actionMenuProps}
                        />
                    </CardBottom>
                </CardContent>
            </HomeSetCard>
            <ConfirmDialog
                open={showDeleteConfirmation}
                onClose={handleCloseDeleteConfirmation}
                title="Delete this study set?"
                dialogMessage="This will permanently delete the study set"
                // @ts-ignore
                onConfirm={() => handleDeleteSet(uuid)}
                confirmButtonText="Delete"
            />
        </>
    )
}

export default HomeStudySetCard;