// @vitest-environment jsdom
// Pins the colour declarations of the components slice 3 moved from brand
// literals to theme values, for Quizaroni Light and Dark. An intentional
// change is regenerated with -u and reviewed line by line.
import type { ReactElement, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import createCache, { type EmotionCache } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { Box } from '@mui/material';
import {
    decomposeColor,
    ThemeProvider,
    type Theme,
} from '@mui/material/styles';
import { describe, expect, it, vi } from 'vite-plus/test';
import { createDarkTheme, createLightTheme } from './themes';
import { NewCard } from 'views/Create/CreateSetStyles';
import {
    DropOverlay,
    StyledTextarea as ImportTextarea,
} from 'views/Create/ImportCartsModal/ImportCardsModal';
import { HomePage } from 'views/Home/HomeStyles';
import {
    activeNavLinkSx,
    CreateStudySetButton,
    StyledNavLink,
} from 'views/NavBar/NavStyles';
import {
    ErrorList,
    StyledTextarea as JsonTextarea,
} from 'views/Profile/JsonSettingsTab';
import StudyHeader from 'views/Study/shared/StudyHeader';
import { CustomInputsContainer } from 'views/ViewStudySet/StudysetSettings/styles';
import {
    StudyModePaper,
    ViewFlashsetCard,
    ViewGridCard,
} from 'views/ViewStudySet/styles';
import ViewStudysetFilters from 'views/ViewStudySet/ViewStudysetFilters/ViewStudysetFilters';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// The real package needs React 19 (see ImportCardsModal.test.tsx).
vi.mock('react-router-dom', () => {
    const Anchor = ({
        children,
        to,
        className,
        ...rest
    }: {
        children?: ReactNode;
        to?: string;
        className?: string;
    }) => (
        <a href={to} className={className} {...rest}>
            {children}
        </a>
    );
    return {
        NavLink: Anchor,
        Link: Anchor,
        useNavigate: () => vi.fn(),
        useParams: () => ({}),
    };
});

vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('utilities/ankiApkg', () => ({
    parseApkg: vi.fn(),
    MAX_APKG_BYTES: 50 * 1024 * 1024,
}));

const COLOR_PROP = /color|background|border|shadow|outline|fill|stroke/i;
const RULE = /^(?:(@[^{]+)\{)?([^{}]+)\{([^{}]*)\}\}?$/;
const KEYFRAMES = /^@(?:-webkit-)?keyframes\s+([\w-]+)\{([\s\S]*)\}$/;
const STEP = /([^{}]+)\{([^{}]*)\}/g;
const COLOR = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;

// One spelling per colour, so rgba(255,160,0,0.2), rgba(255, 160, 0, 0.2)
// and #ffa00033 compare equal.
const canon = (css: string) =>
    css.replace(COLOR, (match) => {
        try {
            const { values } = decomposeColor(match);
            const [r, g, b] = values;
            const a = Math.round((values[3] ?? 1) * 255);
            return `rgba(${r},${g},${b},${a})`;
        } catch {
            return match;
        }
    });

const colourDecls = (body: string) =>
    body
        .split(';')
        .map((d) => d.trim())
        .filter((d) => d && COLOR_PROP.test(d.split(':')[0] ?? ''));

const cssOf = (cache: EmotionCache, el: Element): string => {
    const classes = [...el.classList].filter((c) => c.startsWith('bc-'));
    const out: string[] = [];
    for (const tag of cache.sheet.tags) {
        const text = tag.textContent ?? '';
        const kf = KEYFRAMES.exec(text);
        if (kf) {
            const name = kf[1]!.startsWith('animation-') ? 'KF' : kf[1];
            const steps: string[] = [];
            for (const [, step, body] of kf[2]!.matchAll(STEP)) {
                const decls = colourDecls(body!);
                if (decls.length)
                    steps.push(`${step!.trim()}{${decls.join(';')}}`);
            }
            if (steps.length) out.push(`@keyframes ${name}{${steps.join('')}}`);
            continue;
        }
        const m = RULE.exec(text);
        if (!m) continue;
        const [, atRule, selector, body] = m;
        const cls = classes.find((c) => selector!.includes(`.${c}`));
        if (!cls) continue;
        const decls = colourDecls(body!);
        if (!decls.length) continue;
        const rule = `${selector!.split(`.${cls}`).join('&')}{${decls.join(';')}}`;
        out.push(atRule ? `${atRule}{${rule}}` : rule);
    }
    return out.map(canon).join('\n');
};

const capture = (
    theme: Theme,
    ui: ReactElement,
    pick?: (container: HTMLElement) => Element | null
): string => {
    const cache = createCache({ key: 'bc', speedy: false });
    const { container } = render(
        <CacheProvider value={cache}>
            <ThemeProvider theme={theme}>{ui}</ThemeProvider>
        </CacheProvider>
    );
    const el = pick?.(container) ?? container.firstElementChild;
    const css = el ? cssOf(cache, el) : '';
    cleanup();
    cache.sheet.flush();
    return css;
};

const noop = () => {};

const CASES: [
    string,
    () => ReactElement,
    ((container: HTMLElement) => Element | null)?,
][] = [
    ['CreateSetStyles.NewCard', () => <NewCard />],
    ['HomeStyles.HomePage', () => <HomePage />],
    ['ImportCardsModal.DropOverlay', () => <DropOverlay />],
    [
        'ImportCardsModal.StyledTextarea',
        () => <ImportTextarea hasError={false} isDragging={false} />,
    ],
    [
        'ImportCardsModal.StyledTextarea.dragging',
        () => <ImportTextarea hasError={false} isDragging />,
    ],
    [
        'ImportCardsModal.StyledTextarea.error',
        () => <ImportTextarea hasError isDragging={false} />,
    ],
    ['JsonSettingsTab.ErrorList', () => <ErrorList />],
    ['JsonSettingsTab.StyledTextarea', () => <JsonTextarea hasError={false} />],
    ['JsonSettingsTab.StyledTextarea.error', () => <JsonTextarea hasError />],
    [
        'NavStyles.CreateStudySetButton',
        () => <CreateStudySetButton variant="contained" />,
        (c) => c.querySelector('button'),
    ],
    [
        'NavStyles.StyledNavLink',
        () => <StyledNavLink to="/" className="active" />,
        (c) => c.querySelector('a'),
    ],
    [
        'NavStyles.activeNavLinkSx',
        () => <Box className="active" sx={activeNavLinkSx} />,
    ],
    [
        'StudyHeader.appBar',
        () => (
            <StudyHeader
                studysetTitle="Set"
                studysetUUID="uuid"
                currentCard={1}
                totalCards={3}
                score={2}
                streak={1}
                audioEnabled={false}
                onToggleAudio={noop}
                onSettings={noop}
            />
        ),
        (c) => c.querySelector('header'),
    ],
    [
        'StudyHeader.scorePill',
        () => (
            <StudyHeader
                studysetTitle="Set"
                studysetUUID="uuid"
                currentCard={1}
                totalCards={3}
                score={2}
                streak={1}
                audioEnabled={false}
                onToggleAudio={noop}
                onSettings={noop}
            />
        ),
        () => screen.getByText('header.score').parentElement,
    ],
    ['StudysetSettings.CustomInputsContainer', () => <CustomInputsContainer />],
    ['ViewStudySet.StudyModePaper', () => <StudyModePaper />],
    ['ViewStudySet.ViewFlashsetCard', () => <ViewFlashsetCard />],
    ['ViewStudySet.ViewGridCard', () => <ViewGridCard />],
    [
        'ViewStudysetFilters.countPill',
        () => (
            <ViewStudysetFilters
                selectedTab="all"
                setSelectedTab={noop}
                selectedStudyset={undefined}
                sortDirection="asc"
                setSortDirection={noop}
                selectedSort="term"
                setSelectedSort={noop}
                viewMode="list"
                setViewMode={noop}
                cardCount={3}
                cardCountVisible
            />
        ),
        (c) =>
            c.querySelector('[data-testid="CreditCardIcon"]')?.parentElement ??
            null,
    ],
];

describe.each([
    ['light', createLightTheme],
    ['dark', createDarkTheme],
] as const)('%s brand colour CSS', (mode, makeTheme) => {
    it('matches its snapshot', async () => {
        const theme = makeTheme();
        const sections = CASES.map(([name, ui, pick]) => {
            const css = capture(theme, ui(), pick);
            expect(css, name).not.toBe('');
            return `/* ${name} */\n${css}`;
        });
        await expect(`${sections.join('\n\n')}\n`).toMatchFileSnapshot(
            `./__snapshots__/brandCss.${mode}.css.snap`
        );
    });
});
