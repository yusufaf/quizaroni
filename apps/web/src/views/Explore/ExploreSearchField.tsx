import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import { CloseRounded, Search as SearchIcon } from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { EXPLORE_QUERY_MAX_CHARS } from '@quizaroni/shared-types';
import { QUERY_PARAMS } from 'shared/constants';
import {
    isSearchStart,
    parseQueryParam,
    SEARCH_DEBOUNCE_MS,
    SEARCH_START_STATE,
    withQuery,
} from './searchQuery';

/**
 * The Explore header's search (#137). It searches Community only, as its
 * label says. The draft is written to `?q=` 300ms after the last keystroke,
 * or at once on Enter or clear.
 */
const ExploreSearchField = () => {
    const { t } = useTranslation('explore');
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const urlQuery = parseQueryParam(
        searchParams.get(QUERY_PARAMS.EXPLORE_QUERY)
    );
    const [draft, setDraft] = useState(urlQuery);
    // The q this field last wrote or adopted from the URL.
    const writtenRef = useRef(urlQuery);

    // Back, Forward or a link changed q: show it.
    useEffect(() => {
        if (urlQuery !== writtenRef.current) {
            writtenRef.current = urlQuery;
            setDraft(urlQuery);
        }
    }, [urlQuery]);

    // Pushes when a search starts, so Back returns to the unsearched feed,
    // and replaces while refining, so Back doesn't replay keystrokes.
    const commit = (value: string) => {
        const next = value.trim();
        if (next === writtenRef.current) return;
        const push = writtenRef.current === '';
        const startedHere = isSearchStart(location.state);
        writtenRef.current = next;
        if (next === '' && startedHere) {
            // The entry before is this URL without q.
            void navigate(-1);
        } else if (push) {
            setSearchParams((prev) => withQuery(prev, next), {
                state: SEARCH_START_STATE,
            });
        } else {
            setSearchParams((prev) => withQuery(prev, next), {
                replace: true,
                state: startedHere ? SEARCH_START_STATE : undefined,
            });
        }
    };
    // setSearchParams changes identity with the URL, so the debounce reads
    // the latest commit through a ref rather than depending on it.
    const commitRef = useRef(commit);
    commitRef.current = commit;

    useEffect(() => {
        const id = setTimeout(
            () => commitRef.current(draft),
            SEARCH_DEBOUNCE_MS
        );
        return () => clearTimeout(id);
    }, [draft]);

    const onClear = () => {
        setDraft('');
        commit('');
        inputRef.current?.focus();
    };

    return (
        <Box role="search" sx={{ width: { xs: '100%', sm: '20rem' } }}>
            <TextField
                type="search"
                label={t('search.label')}
                size="small"
                fullWidth
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit(draft);
                }}
                inputRef={inputRef}
                inputProps={{
                    'data-shortcut-search': 'true',
                    maxLength: EXPLORE_QUERY_MAX_CHARS,
                    enterKeyHint: 'search',
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    endAdornment: draft ? (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                aria-label={t('search.clear')}
                                onClick={onClear}
                            >
                                <CloseRounded />
                            </IconButton>
                        </InputAdornment>
                    ) : null,
                }}
                // Our labelled clear button replaces the native one.
                sx={{
                    '& input::-webkit-search-cancel-button': {
                        display: 'none',
                    },
                }}
            />
        </Box>
    );
};

export default ExploreSearchField;
