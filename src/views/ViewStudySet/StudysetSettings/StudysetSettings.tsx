import { Studyset } from 'shared/types';
import { StyledDialog, StyledDialogContent } from './styles';
import { FlexColumn } from 'styles/AppStyles';
import FormatTerminologies from './FormatTerminologies';
import LabelTerminologies from './LabelTerminologies';
import {
    CARD_COUNT_VISIBILITY_OPTIONS,
    NOTES_DRAWER_INITIAL_APPEARANCE_OPTIONS,
    NOTES_DRAWER_POSITIONS_OPTIONS,
} from 'shared/constants';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import SettingsToggle from 'components/SettingsToggle/SettingsToggle';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { FormControl, FormLabel } from '@mui/material';

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};
const StudysetSettings = ({ open, onClose, studyset }: Props) => {
    const { mutate: updateStudySet } = useUpdateStudyset();

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
            <StandardDialogTitle title="Studyset Settings" onClose={onClose} />
            <StyledDialogContent>
                <FormatTerminologies studyset={studyset} />
                <LabelTerminologies studyset={studyset} />
                <FormControl>
                    <FormLabel sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>Cards</FormLabel>
                    <FlexColumn style={{ gap: '1rem', marginTop: '0.5rem' }}>
                        <SettingsToggle
                            label="Show Card Count"
                            options={CARD_COUNT_VISIBILITY_OPTIONS}
                            selectedValue={studyset?.metadata?.cardCountVisible}
                            property="cardCountVisible"
                            onChange={handleSettingToggleChange}
                        />
                    </FlexColumn>
                </FormControl>
                <FormControl>
                    <FormLabel sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>Notes</FormLabel>
                    <FlexColumn style={{ gap: '1rem', marginTop: '0.5rem' }}>
                        <SettingsToggle
                            label={`Notes Drawer Alignment`}
                            options={NOTES_DRAWER_POSITIONS_OPTIONS}
                            selectedValue={studyset?.metadata?.notesDrawerPosition}
                            property="notesDrawerPosition"
                            onChange={handleSettingToggleChange}
                        />
                        <SettingsToggle
                            label={`Notes Drawer Initial Appearance`}
                            options={NOTES_DRAWER_INITIAL_APPEARANCE_OPTIONS}
                            selectedValue={studyset?.metadata?.notesDrawerInitial}
                            property="notesDrawerInitial"
                            onChange={handleSettingToggleChange}
                        />
                    </FlexColumn>
                </FormControl>
            </StyledDialogContent>
        </StyledDialog>
    );
};

export default StudysetSettings;
