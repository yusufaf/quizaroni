import { Studyset } from 'lib/types';
import { StyledDialog, StyledDialogContent } from './styles';
import { FlexColumn, StyledDialogTitle } from 'common/AppStyles';
import CloseDialogButton from 'components/CloseDialogButton/CloseDialogButton';
import FormatTerminologies from './FormatTerminologies';
import LabelTerminologies from './LabelTerminologies';
import {
    CARD_COUNT_VISIBILITY_OPTIONS,
    NOTES_DRAWER_INITIAL_APPEARANCE_OPTIONS,
    NOTES_DRAWER_POSITIONS_OPTIONS,
} from 'utilities/constants';
import { useUpdateStudysetMutation } from 'state/api/studysetsAPI';
import SettingsToggle from 'components/SettingsToggle/SettingsToggle';

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};
const StudysetSettings = ({ open, onClose, studyset }: Props) => {
    const [updateStudySet] = useUpdateStudysetMutation();

    const handleSettingToggleChange = (
        _event: React.MouseEvent<HTMLElement, MouseEvent>,
        value: any,
        property?: string
    ) => {
        if (!property) {
            return;
        }
        updateStudySet({
            studysetUUID: studyset?.studysetUUID ?? '',
            updates: {
                [property]: value,
            },
            isMetadataUpdate: true,
        });
    };

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StyledDialogTitle>
                Studyset Settings
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <StyledDialogContent>
                <FormatTerminologies studyset={studyset} />
                <LabelTerminologies studyset={studyset} />
                <FlexColumn style={{ gap: '1rem' }}>
                    <SettingsToggle
                        label={`Notes Drawer Alignment`}
                        options={NOTES_DRAWER_POSITIONS_OPTIONS}
                        selectedValue={studyset?.metadata?.notesDrawerPosition}
                        property='notesDrawerPosition'
                        onChange={handleSettingToggleChange}
                    />
                    <SettingsToggle
                        label={`Notes Drawer Initial Appearance`}
                        options={NOTES_DRAWER_INITIAL_APPEARANCE_OPTIONS}
                        selectedValue={studyset?.metadata?.notesDrawerInitial}
                        property='notesDrawerInitial'
                        onChange={handleSettingToggleChange}
                    />
                    <SettingsToggle
                        label="Show Card Count"
                        options={CARD_COUNT_VISIBILITY_OPTIONS}
                        selectedValue={studyset?.metadata?.cardCountVisible}
                        property="cardCountVisible"
                        onChange={handleSettingToggleChange}
                    />
                </FlexColumn>
            </StyledDialogContent>
        </StyledDialog>
    );
};

export default StudysetSettings;
