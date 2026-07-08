import type { Options as ConfettiOptions } from 'canvas-confetti';

/**
 * Fire a confetti burst, loading canvas-confetti on demand so the ~5KB library
 * stays out of the initial bundle and only downloads the first time confetti
 * actually fires (e.g. a completed match or a high-scoring results screen).
 */
export const fireConfetti = (options: ConfettiOptions): void => {
    void import('canvas-confetti').then(({ default: confetti }) => {
        confetti(options);
    });
};
