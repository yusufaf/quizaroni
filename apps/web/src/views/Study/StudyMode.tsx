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

    // A new set or mode remounts the view, dropping its local state.
    const key = `${studysetId}:${mode}`;

    switch (mode) {
        case STUDY_MODES.FLASHCARDS:
            return <FlashcardsStudy key={key} studysetId={studysetId} />;
        case STUDY_MODES.MULTIPLE_CHOICE:
            return <MultipleChoiceStudy key={key} studysetId={studysetId} />;
        case STUDY_MODES.MATCHING:
            return <MatchingStudy key={key} studysetId={studysetId} />;
        case STUDY_MODES.TYPE_WRITE:
            return <TypeWriteStudy key={key} studysetId={studysetId} />;
        case STUDY_MODES.REVIEW:
            return (
                <FlashcardsStudy key={key} studysetId={studysetId} reviewMode />
            );
        default:
            return <Navigate to={`/view/${studysetId}`} replace />;
    }
};

export default StudyMode;
