import { Studyset } from 'shared/types';
import { DEFAULT_USER_RESPONSE, DEFAULT_USER_DATA } from 'shared/constants';
import {
    HomeHTMLTableWrapper,
    HomeHTMLTable,
    HTMLTableThead,
} from './HomeStyles';
import { IconButton } from '@mui/material';
import { MoreHoriz } from '@mui/icons-material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SetActionsMenu from './SetActionsMenu';
import { GhostLink } from 'styles/AppStyles';
import { useGetUser } from 'state/api/usersAPI';
import { formatDateUsingPreferred } from 'shared/utilities/general';

type Props = {
    studysets: Studyset[];
};

const HTML_TABLE_COLUMNS = [
    'title',
    'description',
    'created',
    'lastViewed',
    'numberOfCards',
    'labels',
    'favorited',
] as const;

const HomeHTMLView = ({ studysets }: Props) => {
    const { t } = useTranslation();
    const [localSelectedStudyset, setLocalSelectedStudyset] =
        useState<Studyset | null>(null);
    const [actionsMenuOpen, setActionsMenuOpen] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const {
        data: {
            user: {
                metadata: { preferredDateFormat } = DEFAULT_USER_DATA.metadata,
            } = {},
        } = DEFAULT_USER_RESPONSE,
    } = useGetUser();

    const openActionsMenu = (
        event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
        studyset: Studyset
    ) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
        setLocalSelectedStudyset(studyset);
    };

    const closeActionsMenu = () => {
        setAnchorEl(null);
        setActionsMenuOpen(false);
    };

    return (
        <>
            <HomeHTMLTableWrapper>
                <HomeHTMLTable>
                    <HTMLTableThead>
                        <tr>
                            {HTML_TABLE_COLUMNS.map((column) => (
                                <th key={column}>
                                    {t(`home.columns.${column}`)}
                                </th>
                            ))}
                        </tr>
                    </HTMLTableThead>
                    <tbody>
                        {studysets.map((studyset) => {
                            return (
                                <tr>
                                    <td>
                                        <GhostLink
                                            to={`/view/${studyset.studysetUUID}`}
                                        >
                                            {studyset.title}
                                        </GhostLink>
                                    </td>
                                    <td>{studyset.description}</td>
                                    <td>
                                        {formatDateUsingPreferred(
                                            studyset.createdAt,
                                            preferredDateFormat
                                        )}
                                    </td>
                                    <td>
                                        {formatDateUsingPreferred(
                                            studyset.lastViewed,
                                            preferredDateFormat
                                        )}
                                    </td>
                                    <td>{studyset.cards.length}</td>
                                    <td>
                                        {studyset.labels?.length
                                            ? studyset.labels.join(', ')
                                            : t('home.noLabelsOnSet')}
                                    </td>
                                    <td>{studyset.favorited ? '✅' : '❌'}</td>
                                    <td>
                                        <IconButton
                                            aria-label={t('home.moreActions')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openActionsMenu(e, studyset);
                                            }}
                                            sx={{
                                                height: '2rem',
                                                width: '2rem',
                                            }}
                                        >
                                            <MoreHoriz />
                                        </IconButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </HomeHTMLTable>
            </HomeHTMLTableWrapper>
            <SetActionsMenu
                studyset={localSelectedStudyset}
                open={actionsMenuOpen}
                onClose={closeActionsMenu}
                anchorEl={anchorEl}
            />
        </>
    );
};

export default HomeHTMLView;
