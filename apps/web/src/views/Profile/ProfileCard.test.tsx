// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import { DEFAULT_USER_DATA } from 'shared/constants';
import type { User } from 'shared/types';
import ProfileCard from './ProfileCard';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('state/api/studysetsAPI', () => ({
    useGetAllStudysets: () => ({
        data: { studysets: [] },
        isLoading: false,
    }),
}));

const renderCard = (overrides: Partial<User>) =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <ProfileCard
                userData={{
                    ...DEFAULT_USER_DATA,
                    createdAt: '2026-10-27T05:49:52.225Z',
                    email: 'zed@example.com',
                    userUUID: 'a1b2c3d4e5f6',
                    ...overrides,
                }}
            />
        </ThemeProvider>
    );

describe('ProfileCard', () => {
    it('shows the username and its initial', () => {
        renderCard({ username: 'turtles' });

        expect(screen.getByText('T')).toBeTruthy();
        expect(screen.getByText('turtles')).toBeTruthy();
    });

    // A Logto account created without a username stores null.
    it.each([
        ['null', null],
        ['empty', ''],
    ])('uses the email initial for a %s username', (_label, username) => {
        renderCard({ username });

        expect(screen.getByText('Z')).toBeTruthy();
        expect(screen.getByText('N/A')).toBeTruthy();
    });
});
