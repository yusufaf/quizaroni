import { PRINT_LAYOUTS } from 'shared/constants';
import { BasePdfGenerator } from './basePdfGenerator';
import { FlashcardPdfGenerator } from './flashcardPdfGenerator';
import { ListPdfGenerator } from './listPdfGenerator';
import { GridPdfGenerator } from './gridPdfGenerator';

/**
 * Factory function to get the appropriate PDF generator based on layout
 */
export function getPdfGenerator(layout: string): BasePdfGenerator {
    switch (layout) {
        case PRINT_LAYOUTS.FLASHCARD:
            return new FlashcardPdfGenerator();
        case PRINT_LAYOUTS.LIST:
            return new ListPdfGenerator();
        case PRINT_LAYOUTS.GRID:
            return new GridPdfGenerator();
        default:
            // Default to list layout if unknown
            return new ListPdfGenerator();
    }
}

// Re-export classes for direct access if needed
export { FlashcardPdfGenerator } from './flashcardPdfGenerator';
export { ListPdfGenerator } from './listPdfGenerator';
export { GridPdfGenerator } from './gridPdfGenerator';
export { BasePdfGenerator } from './basePdfGenerator';
export { ImageLoader } from './imageLoader';
