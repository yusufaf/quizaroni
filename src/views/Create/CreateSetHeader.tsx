import { ArrowBack, Create } from "@mui/icons-material";
import {
  Button,
  Typography,
  Autocomplete,
  TextField,
  Chip,
  FormHelperText,
} from "@mui/material";
import { BoldTypography } from "styles/AppStyles";
import { DEFAULT_USER_RESPONSE } from "shared/constants";
import HeaderAdvancedSection from "./HeaderAdvancedSection";
import {
  CreateSetInputsContainer,
  CreateSetPaper,
  DescriptionInput,
  HeaderContainer,
  HeaderLeft,
  HeaderRight,
  TitleInput,
  BackToViewButton,
} from "./CreateSetStyles";
import { useNavigate, useParams } from "react-router-dom";
import { useGetUser } from "state/api/usersAPI";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

type Props = {
  advancedSectionProps: any;
  saveChanges: () => void;
  mainButtonDisabled: boolean;
  description: string;
  labels: string[];
  onDescriptionChange: any;
  onLabelsChange: (labels: string[]) => void;
  onTitleChange: any;
  title: string;
};

const CreateSetHeader = ({
  advancedSectionProps,
  description,
  labels: selectedLabels,
  mainButtonDisabled,
  onDescriptionChange,
  onLabelsChange,
  onTitleChange,
  saveChanges,
  title,
}: Props) => {
  const navigate = useNavigate();
  const { id: studySetUUID } = useParams();
  const { t } = useTranslation();

  const {
    data: { user: { labels: userLabels = [] } } = DEFAULT_USER_RESPONSE,
  } = useGetUser();

  const handleBackToViewing = () => {
    navigate(`/view/${studySetUUID}`);
  };

  return (
    <CreateSetPaper elevation={6}>
      <HeaderContainer>
        <HeaderLeft>
          <BackToViewButton
            onClick={handleBackToViewing}
            startIcon={<ArrowBack color="primary" />}
          >
            {t("create.backToViewing")}
          </BackToViewButton>
          <BoldTypography variant="h5">
            {t("create.editYourStudySet")}
          </BoldTypography>
          <CreateSetInputsContainer>
            <div>
              <BoldTypography variant="subtitle1">
                {t("create.titleRequired")}
              </BoldTypography>
              <TitleInput
                variant="standard"
                placeholder={t("create.enterTitle")}
                value={title}
                onChange={onTitleChange}
                size="small"
              />
            </div>
            <div>
              <BoldTypography variant="subtitle1">
                {t("create.description")}
              </BoldTypography>
              <DescriptionInput
                variant="outlined"
                placeholder={t("create.enterDescription")}
                value={description}
                onChange={onDescriptionChange}
                multiline
                rows={3}
              />
            </div>
            <div>
              <BoldTypography variant="subtitle1">
                {t("create.labels")}
              </BoldTypography>
              <Autocomplete
                multiple
                freeSolo
                options={userLabels}
                value={selectedLabels}
                onChange={(_event, newValue) => {
                  if (newValue.length > 10) {
                    toast.warning(t("create.labelsSoftLimitWarning"), {
                      toastId: "create-labels-soft-limit",
                    });
                  }
                  onLabelsChange(newValue);
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      size="small"
                      {...getTagProps({ index })}
                      key={index}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder={
                      selectedLabels.length === 0
                        ? t("create.addLabelsPlaceholder")
                        : ""
                    }
                    size="small"
                  />
                )}
                sx={{ width: "100%", maxWidth: "40rem" }}
              />
              <FormHelperText sx={{ ml: 0.5 }}>
                {t("create.labelsHint", {
                  defaultValue:
                    "Select existing labels or type a new one and press Enter",
                })}
              </FormHelperText>
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
            {t("create.saveChanges")}
          </Button>
          <HeaderAdvancedSection {...advancedSectionProps} />
        </HeaderRight>
      </HeaderContainer>
    </CreateSetPaper>
  );
};

export default CreateSetHeader;
