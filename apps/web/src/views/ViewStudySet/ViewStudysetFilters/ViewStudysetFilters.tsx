import { Dispatch, SetStateAction, SyntheticEvent, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CardFiltersContainer,
  CategoryTab,
  CategoryTabs,
  SortCardsDropdown,
} from "../styles";
import { SimpleFlexContainer } from "styles/AppStyles";
import {
  DEFAULT_CATEGORIES,
  SORT_DIRECTIONS,
  VIEW_SET_DIALOGS,
  VIEWSET_LAYOUTS,
} from "shared/constants";
import { Studyset, SortDirection } from "shared/types";
import {
  Box,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowUpward,
  ArrowDownward,
  Category,
  CreditCard,
  ViewList,
  ViewModule,
} from "@mui/icons-material";
import { useViewSetsStore } from "state/stores/viewSets";
import NoCardsWarningsIcon from "components/NoCardsWarningsIcon/NoCardsWarningsIcon";

type Props = {
  selectedTab: string;
  setSelectedTab: Dispatch<SetStateAction<string>>;
  selectedStudyset: Studyset | undefined;
  sortDirection: SortDirection;
  setSortDirection: Dispatch<SetStateAction<SortDirection>>;
  selectedSort: string;
  setSelectedSort: Dispatch<SetStateAction<string>>;
  viewMode: string;
  setViewMode: Dispatch<SetStateAction<string>>;
  cardCount?: number;
  cardCountVisible?: boolean;
};

const ViewStudysetFilters = ({
  selectedTab,
  setSelectedTab,
  selectedStudyset,
  sortDirection,
  setSortDirection,
  selectedSort,
  setSelectedSort,
  viewMode,
  setViewMode,
  cardCount,
  cardCountVisible,
}: Props) => {
  const { t } = useTranslation();
  const { setSelectedDialog } = useViewSetsStore();

  // Map default category values to translation keys
  const getCategoryLabel = (category: string) => {
    if (category === DEFAULT_CATEGORIES.ALL) return t("viewStudySet.all");
    if (category === DEFAULT_CATEGORIES.IMPORTANT)
      return t("viewStudySet.important");
    return category; // User-defined categories stay as-is
  };

  const categoryTabs = useMemo(() => {
    const jointCategories = [
      ...Object.values(DEFAULT_CATEGORIES),
      ...(selectedStudyset?.categories ?? []),
    ];
    return jointCategories.map((tab, index) => {
      return (
        <CategoryTab key={index} label={getCategoryLabel(tab)} value={tab} />
      );
    });
  }, [selectedStudyset, t]);

  const onTabChange = (_e: SyntheticEvent, newTab: string) => {
    setSelectedTab(newTab);
  };

  const toggleSortDirection = () => {
    const { ASC, DSC } = SORT_DIRECTIONS;
    const newSortDirection = sortDirection === ASC ? DSC : ASC;
    setSortDirection(newSortDirection);
  };

  const onSortChange = (event: SelectChangeEvent<string>) => {
    setSelectedSort(event.target.value);
  };

  const handleShowCategoriesDialog = () => {
    setSelectedDialog(VIEW_SET_DIALOGS.CATEGORIES);
  };

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newView: string | null,
  ) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  return (
    <CardFiltersContainer>
      <SimpleFlexContainer style={{ gap: "1rem" }}>
        {cardCountVisible && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "1.5rem",
              backgroundColor: "rgba(255, 160, 0, 0.1)",
              border: "0.0625rem solid rgba(255, 160, 0, 0.3)",
              width: "fit-content",
              flexShrink: 0,
            }}
          >
            <CreditCard sx={{ color: "primary.main", fontSize: "1.25rem" }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              {`${cardCount ?? "N/A"} ${t("viewStudySet.card", { count: cardCount ?? 0 })}`}
            </Typography>
            {!cardCount && <NoCardsWarningsIcon />}
          </Box>
        )}
        <CategoryTabs
          value={selectedTab}
          onChange={onTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categoryTabs}
        </CategoryTabs>
        <Tooltip title={t("viewStudySet.manageCategories")}>
          <IconButton
            color="primary"
            onClick={handleShowCategoriesDialog}
            aria-label={t("viewStudySet.manageCategories")}
          >
            <Category />
          </IconButton>
        </Tooltip>
      </SimpleFlexContainer>
      <SimpleFlexContainer>
        <IconButton
          color="primary"
          onClick={toggleSortDirection}
          title={t("viewStudySet.sortDirection")}
        >
          {sortDirection === SORT_DIRECTIONS.ASC ? (
            <ArrowUpward />
          ) : (
            <ArrowDownward />
          )}
        </IconButton>
        <SortCardsDropdown>
          <InputLabel id="sort-label" size="small">
            {t("viewStudySet.sort")}
          </InputLabel>
          <Select
            labelId="sort-label"
            label={t("viewStudySet.sort")}
            value={selectedSort}
            onChange={onSortChange}
            autoWidth
            size="small"
          >
            <MenuItem value="">
              <em>{t("viewStudySet.none")}</em>
            </MenuItem>
            <MenuItem value={"term"}>
              {t("viewStudySet.alphabeticalTerm")}
            </MenuItem>
            <MenuItem value={"definition"}>
              {t("viewStudySet.alphabeticalDefinition")}
            </MenuItem>
            <MenuItem value={"label"}>
              {t("viewStudySet.alphabeticalLabel")}
            </MenuItem>
          </Select>
        </SortCardsDropdown>
        <ToggleButtonGroup
          aria-label="View mode toggle"
          exclusive
          onChange={handleViewModeChange}
          value={viewMode}
          size="small"
          sx={{ marginLeft: "1rem" }}
        >
          <ToggleButton
            value={VIEWSET_LAYOUTS.LIST}
            title={t("viewStudySet.listView")}
          >
            <ViewList />
          </ToggleButton>
          <ToggleButton
            value={VIEWSET_LAYOUTS.GRID}
            title={t("viewStudySet.gridView")}
          >
            <ViewModule />
          </ToggleButton>
        </ToggleButtonGroup>
      </SimpleFlexContainer>
    </CardFiltersContainer>
  );
};

export default ViewStudysetFilters;
