import { useEffect, useRef } from "react";
import {
  Add as AddIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  MenuOpen as MenuOpenIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  StickyNote2 as NoteIcon,
} from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Chip,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material/";
import {
  BoldTypography,
  SimpleFlexContainer,
  SpacedFlexContainer,
} from "styles/AppStyles";
import CloseDialogButton from "components/StandardDialogTitle/StandardDialogTitle";
import useCustomMutation from "hooks/useCustomMutation";
import { Card, OpenCardNotes, Studyset, UUID } from "shared/types";
import { useMemo, useState } from "react";
import {
  useCreateNote,
  useEditNote,
  useUpdateStudyset,
} from "state/api/studysetsAPI";
import { NOTES_DRAWER_INITIAL_APPEARANCE } from "shared/constants";
import NotesList from "./NotesList";
import { StyledDrawer, CardPreviewText, EmptyStateBox } from "./styles";
import { useTranslation } from "react-i18next";

type Props = {
  selectedStudyset: Studyset;
  isHidden?: boolean;
  onToggle?: (hidden: boolean) => void;
};

const transitionDuration = 1000; //can also use theme.transitions.duration

const NotesDrawer = (props: Props) => {
  const { selectedStudyset, isHidden: externalHidden, onToggle } = props;
  const { t } = useTranslation();

  const {
    studysetUUID = "",
    metadata: { notesDrawerInitial = "", notesDrawerPosition = "right" } = {},
  } = selectedStudyset || {};

  // Use external hidden state if provided, otherwise use internal state
  const [internalHidden, setInternalHidden] = useState<boolean>(
    notesDrawerInitial === NOTES_DRAWER_INITIAL_APPEARANCE.CLOSED,
  );

  const hidden = externalHidden !== undefined ? externalHidden : internalHidden;
  const setHidden = (value: boolean) => {
    if (onToggle) {
      onToggle(value);
    } else {
      setInternalHidden(value);
    }
  };
  const [openNotes, setOpenNotes] = useState<OpenCardNotes>(new Set());
  const [currentEditKey, setCurrentEditKey] = useState<string>("");
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const lastSearchQueryRef = useRef<string>("");

  const [noteActionsStack, setNoteActionsStack] = useState([]);

  const sortMenuOpen = Boolean(sortAnchorEl);
  const notesSortBy = selectedStudyset?.metadata?.notesSortBy || "cardOrder";
  const notesSortDirection =
    selectedStudyset?.metadata?.notesSortDirection || "asc";

  const {
    mutate: createNote,
    isLoading: isCreateNoteLoading,
    isSuccess: isCreateNoteSuccess,
    isError: isCreateNoteError,
  } = useCustomMutation({
    mutation: useCreateNote,
    successMessage: "Successfully created note",
    errorMessage: "Error creating note",
  });

  const {
    mutate: editNote,
    isLoading: isEditNoteLoading,
    isSuccess: isEditNoteSuccess,
    isError: isEditNoteError,
  } = useCustomMutation({
    mutation: useEditNote,
    successMessage: "Successfully edited note",
    errorMessage: "Error editing note",
  });

  const { mutate: updateStudyset } = useUpdateStudyset();

  const fabPosition = useMemo(() => {
    if (notesDrawerPosition === "right") {
      return { right: "1.5rem", top: "5.5rem" };
    }
    return { left: "1.5rem", top: "5.5rem" };
  }, [notesDrawerPosition]);

  const sortedCards = useMemo(() => {
    if (!selectedStudyset?.cards) return [];

    return selectedStudyset.cards.map((card) => {
      const sortedNotes = [...card.notes];

      if (notesSortBy === "alphabetical") {
        sortedNotes.sort((a, b) => {
          const comparison = a.text.localeCompare(b.text);
          return notesSortDirection === "asc" ? comparison : -comparison;
        });
      } else if (notesSortBy === "date") {
        sortedNotes.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const comparison = aTime - bTime;
          return notesSortDirection === "asc" ? comparison : -comparison;
        });
      }
      // cardOrder doesn't need sorting (preserves original order)

      return { ...card, notes: sortedNotes };
    });
  }, [selectedStudyset, notesSortBy, notesSortDirection]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return sortedCards;
    const query = searchQuery.toLowerCase();
    return sortedCards.filter((card) =>
      card.notes.some((note) => note.text?.toLowerCase().includes(query)),
    );
  }, [sortedCards, searchQuery]);

  // Auto-expand cards that match search (only when search query changes)
  useEffect(() => {
    if (searchQuery.trim() && searchQuery !== lastSearchQueryRef.current) {
      const matchingUUIDs = new Set(filteredCards.map((c) => c.cardUUID));
      setOpenNotes(matchingUUIDs);
      lastSearchQueryRef.current = searchQuery;
    }
  }, [searchQuery, filteredCards]);

  const onClose = () => {
    setHidden(true);
  };

  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortChange = (sortBy: string, direction: string) => {
    updateStudyset({
      studysetUUID,
      updates: {
        notesSortBy: sortBy,
        notesSortDirection: direction,
      },
      isMetadataUpdate: true,
    });
    handleSortMenuClose();
  };

  /**
   * Toggle the notes for this card being open
   * @returns {void}
   */
  const toggleNotesOpen = (uuid: UUID, isExpanded: boolean) => {
    const newOpenNotes = new Set(openNotes);
    isExpanded ? newOpenNotes.add(uuid) : newOpenNotes.delete(uuid);
    setOpenNotes(newOpenNotes);
  };

  const handleAccordionChange =
    (cardUUID: UUID) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      toggleNotesOpen(cardUUID, isExpanded);
    };

  const handleEditingNoteToggle = (uuid: UUID) => {
    const keyToUse = uuid === currentEditKey ? "" : uuid;
    setCurrentEditKey(keyToUse);
  };

  const handleEditNoteBlur = ({
    cardUUID,
    noteUUID,
    currentValue,
    editedValue,
  }: {
    cardUUID: UUID;
    noteUUID: UUID;
    currentValue: string;
    editedValue: string;
  }) => {
    handleEditingNoteToggle(noteUUID);
    if (currentValue !== editedValue) {
      editNote({
        studysetUUID,
        cardUUID,
        noteUUID,
        text: editedValue,
      });
    }
  };

  return hidden ? (
    <>
      <Fab
        onClick={() => setHidden(false)}
        color="primary"
        size="small"
        aria-label={t("notesDrawer.openNotesDrawer")}
        title={t("notesDrawer.openNotesDrawer")}
        sx={{
          position: "fixed",
          ...fabPosition,
        }}
      >
        <MenuOpenIcon fontSize="medium" />
      </Fab>
    </>
  ) : (
    <StyledDrawer
      variant="permanent"
      anchor={notesDrawerPosition}
      open={true}
      transitionDuration={{
        enter: transitionDuration,
        exit: transitionDuration,
      }}
    >
      <SpacedFlexContainer
        sx={{ mb: "0.5rem", pl: "1rem", pr: "1.5rem", pt: "1rem" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <NoteIcon sx={{ color: "primary.main" }} />
          <BoldTypography variant="h5">{t("notesDrawer.title")}</BoldTypography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <Tooltip title={t("notesDrawer.sortNotes")}>
            <IconButton
              onClick={handleSortMenuOpen}
              size="small"
              sx={{
                color: "white",
                "&:hover": { color: "primary.main" },
              }}
            >
              <SortIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <CloseDialogButton onClose={onClose} />
        </Box>
      </SpacedFlexContainer>

      {/* Search Bar */}
      <Box sx={{ pl: "0.5rem", pr: "1.5rem", mb: "1rem" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: "0.875rem",
              height: "36px",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery("")}
                  sx={{ p: 0 }}
                >
                  <CloseIcon
                    fontSize="small"
                    sx={{ color: "text.secondary" }}
                  />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={sortMenuOpen}
        onClose={handleSortMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => handleSortChange("alphabetical", "asc")}>
          {t("notesDrawer.aToZ")}
        </MenuItem>
        <MenuItem onClick={() => handleSortChange("alphabetical", "desc")}>
          {t("notesDrawer.zToA")}
        </MenuItem>
        <MenuItem onClick={() => handleSortChange("date", "desc")}>
          {t("notesDrawer.newestFirst")}
        </MenuItem>
        <MenuItem onClick={() => handleSortChange("date", "asc")}>
          {t("notesDrawer.oldestFirst")}
        </MenuItem>
        <MenuItem onClick={() => handleSortChange("cardOrder", "asc")}>
          {t("notesDrawer.cardOrderAsc")}
        </MenuItem>
        <MenuItem onClick={() => handleSortChange("cardOrder", "desc")}>
          {t("notesDrawer.cardOrderDesc")}
        </MenuItem>
      </Menu>

      {filteredCards && filteredCards.length > 0 ? (
        <Box sx={{ pl: "0.5rem", pr: "1.5rem", pb: "1rem" }}>
          {filteredCards.map((card: Card, index: number) => {
            const { cardUUID, term, definition, notes = [] } = card;
            const noteCount = notes.length;

            return (
              <Accordion
                expanded={openNotes.has(cardUUID)}
                onChange={handleAccordionChange(cardUUID)}
                slotProps={{
                  transition: {
                    unmountOnExit: true,
                  },
                }}
                key={cardUUID}
                sx={{
                  mb: "0.75rem",
                  borderRadius: "0.5rem !important",
                  "&:before": { display: "none" },
                  boxShadow: "0 0.125rem 0.375rem rgba(0,0,0,0.1)",
                  "&.Mui-expanded": {
                    boxShadow: "0 0.25rem 0.75rem rgba(255,160,0,0.15)",
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`Card ${index + 1} content`}
                  sx={{
                    minHeight: "4rem !important",
                    "& .MuiAccordionSummary-content": {
                      my: "0.75rem",
                      overflow: "hidden",
                      flexDirection: "column",
                      gap: "0.25rem",
                    },
                    "& .MuiAccordionSummary-content.Mui-expanded": {
                      my: "0.75rem",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      mb: "0.25rem",
                      flexShrink: 0,
                    }}
                  >
                    <BoldTypography
                      variant="subtitle1"
                      sx={{
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("notesDrawer.card", {
                        index: index + 1,
                      })}
                    </BoldTypography>
                    {noteCount > 0 && (
                      <Chip
                        label={t("notesDrawer.noteCount", { count: noteCount })}
                        size="small"
                        sx={{
                          height: "1.25rem",
                          fontSize: "0.75rem",
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </Box>
                  <CardPreviewText variant="body2">
                    {term || t("notesDrawer.noTerm")}
                  </CardPreviewText>
                  <CardPreviewText
                    variant="caption"
                    sx={{
                      fontStyle: "italic",
                      opacity: 0.7,
                    }}
                  >
                    {definition || t("notesDrawer.noDefinition")}
                  </CardPreviewText>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {noteCount === 0 ? (
                    <EmptyStateBox>
                      <NoteIcon
                        sx={{
                          fontSize: "2rem",
                          opacity: 0.3,
                          mb: "0.5rem",
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {t("notesDrawer.noNotesYet")}
                      </Typography>
                    </EmptyStateBox>
                  ) : (
                    <>
                      <NotesList
                        card={card}
                        currentEditKey={currentEditKey}
                        handleEditNoteBlur={handleEditNoteBlur}
                        handleEditingNoteToggle={handleEditingNoteToggle}
                        studysetUUID={studysetUUID}
                      />
                      <Divider
                        sx={{
                          width: "100%",
                          margin: "1rem 0",
                        }}
                      />
                    </>
                  )}
                  <LoadingButton
                    loading={isCreateNoteLoading}
                    startIcon={<AddIcon />}
                    variant="outlined"
                    onClick={() => {
                      createNote({
                        studysetUUID,
                        cardUUID,
                      });
                    }}
                    sx={{
                      width: "100%",
                    }}
                  >
                    {t("notesDrawer.addNote")}
                  </LoadingButton>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      ) : searchQuery ? (
        <EmptyStateBox sx={{ mt: "2rem" }}>
          <SearchIcon sx={{ fontSize: "3rem", opacity: 0.2, mb: "1rem" }} />
          <Typography variant="h6" color="text.secondary">
            No notes found
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: "0.5rem" }}
          >
            Try a different search term
          </Typography>
        </EmptyStateBox>
      ) : (
        <EmptyStateBox sx={{ mt: "2rem" }}>
          <NoteIcon sx={{ fontSize: "3rem", opacity: 0.2, mb: "1rem" }} />
          <Typography variant="h6" color="text.secondary">
            {t("notesDrawer.noCardsInSet")}
          </Typography>
        </EmptyStateBox>
      )}
    </StyledDrawer>
  );
};

export default NotesDrawer;
