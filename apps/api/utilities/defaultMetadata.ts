import type { StudysetMetadata } from 'models/studysets';

/** The display settings a brand-new set starts with. */
export const defaultStudysetMetadata = (): StudysetMetadata => ({
    backgroundColorVisible: false,
    cardCountVisible: true,
    contentOnly: false,
    customLabelTerminology: '',
    customTerminology: '',
    labelTerminology: 'Card',
    notesDrawerInitial: 'open',
    notesDrawerPosition: 'right',
    publiclyViewable: false,
    terminology: 'Term/Definition',
    textColorVisible: false,
});
