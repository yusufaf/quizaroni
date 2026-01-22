import { Studyset } from 'shared/types';
import { StyledDialog, StyledDialogContent } from './styles';
import { FlexColumn } from 'styles/AppStyles';
import FormatTerminologies from './FormatTerminologies';
import LabelTerminologies from './LabelTerminologies';
import {
    CARD_COUNT_VISIBILITY_OPTIONS,
    CARD_INDEX_VISIBILITY_OPTIONS,
    NOTES_DRAWER_INITIAL_APPEARANCE_OPTIONS,
    NOTES_DRAWER_POSITIONS_OPTIONS,
} from 'shared/constants';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import SettingsToggle from 'components/SettingsToggle/SettingsToggle';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { FormControl, FormLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};
const StudysetSettings = ({ open, onClose, studyset }: Props) => {
    const { t } = useTranslation();
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
            <StandardDialogTitle title={t('studysetSettings.title')} onClose={onClose} />
            <StyledDialogContent>
                <FormatTerminologies studyset={studyset} />
                <LabelTerminologies studyset={studyset} />
                <FormControl>
                    <FormLabel sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{t('studysetSettings.cards')}</FormLabel>
                    <FlexColumn style={{ gap: '1rem', marginTop: '0.5rem' }}>
                        <SettingsToggle
                            label={t('studysetSettings.showCardCount')}
                            options={CARD_COUNT_VISIBILITY_OPTIONS}
                            selectedValue={studyset?.metadata?.cardCountVisible}
                            property="cardCountVisible"
                            onChange={handleSettingToggleChange}
                        />
                        <SettingsToggle
                            label={t('studysetSettings.showCardIndex')}
                            options={CARD_INDEX_VISIBILITY_OPTIONS}
                            selectedValue={studyset?.metadata?.cardIndexVisible}
                            property="cardIndexVisible"
                            onChange={handleSettingToggleChange}
                        />
                    </FlexColumn>
                </FormControl>
                <FormControl>
                    <FormLabel sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{t('studysetSettings.notes')}</FormLabel>
                    <FlexColumn style={{ gap: '1rem', marginTop: '0.5rem' }}>
                        <SettingsToggle
                            label={t('studysetSettings.notesDrawerAlignment')}
                            options={NOTES_DRAWER_POSITIONS_OPTIONS}
                            selectedValue={studyset?.metadata?.notesDrawerPosition}
                            property="notesDrawerPosition"
                            onChange={handleSettingToggleChange}
                        />
                        <SettingsToggle
                            label={t('studysetSettings.notesDrawerInitialAppearance')}
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
