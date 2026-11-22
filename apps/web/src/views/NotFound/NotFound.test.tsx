// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

describe('NotFound', () => {
    it('renders the translated heading and message', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        expect(
            screen.getByRole('heading', { name: 'notFound.title' })
        ).toBeTruthy();
        expect(screen.getByText('notFound.body')).toBeTruthy();
    });

    it('links back to the home page', () => {
        render(
            <MemoryRouter initialEntries={['/nope']}>
                <NotFound />
            </MemoryRouter>
        );

        expect(
            screen
                .getByRole('link', { name: 'notFound.home' })
                .getAttribute('href')
        ).toBe('/');
    });
});
