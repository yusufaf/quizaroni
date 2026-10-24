import { Avatar } from '@mui/material';
import type { ExploreSetSummary } from '@quizaroni/shared-types';
import { useTranslation } from 'react-i18next';
import { formatRelativeDate, toSubjectId } from './communityFeed';
import {
    CardByline,
    TileArticle,
    TileDescription,
    TileEyebrow,
    TileFooter,
    TileLink,
    TileMeta,
    TilePreviewItem,
    TilePreviewList,
    TilePreviewTerm,
    TileTitle,
} from './ExploreStyles';

type Props = { item: ExploreSetSummary };

// No animation delay: a stagger across a growing feed would hold back the
// last cards of a 48-item page by seconds.
const ExploreSetCard = ({ item }: Props) => {
    const { t, i18n } = useTranslation(['explore', 'common']);
    const {
        studysetUUID,
        title,
        description,
        subject,
        termCount,
        previews,
        username,
        publishedAt,
    } = item;
    const locale = i18n?.language ?? 'en';

    return (
        <TileArticle interactive>
            <TileEyebrow>
                {t(`common:subjects.${toSubjectId(subject)}`)}
            </TileEyebrow>
            <TileTitle lines={2}>
                <TileLink to={`/view/${studysetUUID}`}>
                    {title || t('tile.untitled')}
                </TileLink>
            </TileTitle>
            {/* role="list": WebKit drops list semantics, and with them the
                label, from a ul with list-style: none. */}
            {previews.length > 0 ? (
                <TilePreviewList role="list" aria-label={t('tile.previews')}>
                    {previews.map(({ term, definition }, i) => (
                        <TilePreviewItem key={i} lines={2}>
                            <TilePreviewTerm>{term}</TilePreviewTerm>
                            {definition && ` — ${definition}`}
                        </TilePreviewItem>
                    ))}
                </TilePreviewList>
            ) : (
                description && <TileDescription>{description}</TileDescription>
            )}
            <TileFooter>
                <CardByline>
                    <Avatar
                        component="span"
                        aria-hidden="true"
                        sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                    >
                        {username
                            ? Array.from(username)[0]?.toUpperCase()
                            : null}
                    </Avatar>
                    <span>
                        {username ? `@${username}` : t('community.anonymous')}
                    </span>
                </CardByline>
                <TileMeta>
                    {t('community.termCount', { count: termCount })}
                    {' · '}
                    <time dateTime={publishedAt}>
                        {formatRelativeDate(publishedAt, new Date(), locale)}
                    </time>
                </TileMeta>
            </TileFooter>
        </TileArticle>
    );
};

export default ExploreSetCard;
