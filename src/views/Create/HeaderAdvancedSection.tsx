import { Button, IconButton, TextField, Typography, Box } from "@mui/material";
import { BoldTypography, SimpleFlexContainer } from "styles/AppStyles";
import {
  AdvancedSection,
  BlankInputsContainer,
  BlankInputsField,
} from "./CreateSetStyles";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useCreateSetStore } from "state/stores/createSet";
import { useTranslation } from "react-i18next";

type Props = {
  onBlankInputsSubmit: any;
};

const HeaderAdvancedSection = ({ onBlankInputsSubmit = null }: Props) => {
  const { t } = useTranslation();
  const { advancedSectionProps, setAdvancedSectionProps } = useCreateSetStore();

  const { blankCardsCount, expanded } = advancedSectionProps;

  const onBlankInputsChange = (e: any) => {
    const value = parseInt(e.target.value, 10);
    setAdvancedSectionProps({
      blankCardsCount: isNaN(value) ? 0 : Math.max(0, Math.min(100, value)),
      expanded,
    });
  };

  const onToggleExpanded = () => {
    setAdvancedSectionProps({
      blankCardsCount,
      expanded: !expanded,
    });
  };

  const handleBlankInputsSubmit = () => {
    onBlankInputsSubmit();
  };

  return (
    <AdvancedSection>
      <SimpleFlexContainer>
        <BoldTypography>
          {t("create.advanced", { defaultValue: "Advanced" })}
        </BoldTypography>
        <IconButton onClick={onToggleExpanded} size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </SimpleFlexContainer>
      {expanded && (
        <BlankInputsContainer>
          <Box sx={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Typography variant="body2" color="text.secondary">
              {t("create.addBlankCards", { defaultValue: "Add blank cards:" })}
            </Typography>
            <TextField
              type="number"
              size="small"
              value={blankCardsCount}
              onChange={onBlankInputsChange}
              inputProps={{
                min: 0,
                max: 100,
                style: {
                  width: "3rem",
                  textAlign: "center",
                  MozAppearance: "textfield",
                },
              }}
              sx={{
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                  {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleBlankInputsSubmit}
              disabled={!blankCardsCount || blankCardsCount <= 0}
              startIcon={<AddIcon />}
              sx={{ minWidth: "auto" }}
            >
              {t("create.add", { defaultValue: "Add" })}
            </Button>
          </Box>
        </BlankInputsContainer>
      )}
    </AdvancedSection>
  );
};

export default HeaderAdvancedSection;
