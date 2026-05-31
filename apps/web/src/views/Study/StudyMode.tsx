import { useParams, Navigate } from 'react-router-dom';
import { STUDY_MODES } from 'shared/constants';
import FlashcardsStudy from './FlashcardsStudy';
import MultipleChoiceStudy from './MultipleChoiceStudy';
import MatchingStudy from './MatchingStudy';
import TypeWriteStudy from './TypeWriteStudy';

const StudyMode = () => {
    const { studysetId, mode } = useParams<{
        studysetId: string;
        mode: string;
    }>();

    if (!studysetId) {
        return <Navigate to="/" replace />;
    }

    switch (mode) {
        case STUDY_MODES.FLASHCARDS:
            return <FlashcardsStudy studysetId={studysetId} />;
        case STUDY_MODES.MULTIPLE_CHOICE:
            return <MultipleChoiceStudy studysetId={studysetId} />;
        case STUDY_MODES.MATCHING:
            return <MatchingStudy studysetId={studysetId} />;
        case STUDY_MODES.TYPE_WRITE:
            return <TypeWriteStudy studysetId={studysetId} />;
        case STUDY_MODES.REVIEW:
            return <FlashcardsStudy studysetId={studysetId} reviewMode />;
        default:
            return <Navigate to={`/view/${studysetId}`} replace />;
    }
};

export default StudyMode;
