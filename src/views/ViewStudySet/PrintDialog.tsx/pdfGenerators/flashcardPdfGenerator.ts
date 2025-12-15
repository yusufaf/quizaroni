import jsPDF from 'jspdf';
import { Studyset, Card, PrintConfig } from 'shared/types';
import { BasePdfGenerator } from './basePdfGenerator';

/**
 * FlashcardPdfGenerator - Generates 2 full pages per card
 * Page 1: Term with optional term images and categories
 * Page 2: Definition with optional definition images and notes
 */
export class FlashcardPdfGenerator extends BasePdfGenerator {
    async generate(
        studyset: Studyset,
        cards: Card[],
        settings: PrintConfig
    ): Promise<jsPDF> {
        const doc = new jsPDF('portrait', 'pt', 'letter');
        const [term1Label, term2Label] = this.getTerminology(studyset);

        // Remove the first blank page
        let isFirstPage = true;

        for (const card of cards) {
            // TERM PAGE
            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            await this.renderTermPage(
                doc,
                card,
                term1Label,
                settings,
                studyset
            );

            // DEFINITION PAGE
            doc.addPage();
            await this.renderDefinitionPage(
                doc,
                card,
                term2Label,
                settings,
                studyset
            );
        }

        return doc;
    }

    /**
     * Render the term page (front of flashcard)
     */
    private async renderTermPage(
        doc: jsPDF,
        card: Card,
        termLabel: string,
        settings: PrintConfig,
        studyset: Studyset
    ): Promise<void> {
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 100;

        // Background color
        if (settings.showColors && card.backgroundColor) {
            this.fillPageBackground(doc, card.backgroundColor);
        }

        // Text color
        const textColor =
            settings.showColors && card.textColor
                ? card.textColor
                : '#000000';
        this.setTextColor(doc, textColor);

        // Title (Term label)
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        this.centerText(doc, termLabel, y);
        y += 50;

        // Term text
        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        const termLines = this.wrapText(doc, card.term, pageWidth - 100);
        y = this.centerMultilineText(doc, termLines, y, 25);
        y += 40;

        // Term images
        if (settings.includeFiles && card.files.length > 0) {
            y = await this.embedImages(doc, card.files, 'term', y, 400, 300);
            y += 20;
        }

        // Categories
        if (settings.includeCategories && card.categories.length > 0) {
            // Reset text color for categories
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');

            const categoriesText = card.categories.join(' • ');
            const categoryLines = this.wrapText(
                doc,
                categoriesText,
                pageWidth - 80
            );
            this.centerMultilineText(doc, categoryLines, y, 18);
        }

        // Important indicator
        if (card.important) {
            doc.setFontSize(30);
            doc.text('⭐', pageWidth - 50, 50);
        }
    }

    /**
     * Render the definition page (back of flashcard)
     */
    private async renderDefinitionPage(
        doc: jsPDF,
        card: Card,
        definitionLabel: string,
        settings: PrintConfig,
        studyset: Studyset
    ): Promise<void> {
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 100;

        // Background color
        if (settings.showColors && card.backgroundColor) {
            this.fillPageBackground(doc, card.backgroundColor);
        }

        // Text color
        const textColor =
            settings.showColors && card.textColor
                ? card.textColor
                : '#000000';
        this.setTextColor(doc, textColor);

        // Title (Definition label)
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        this.centerText(doc, definitionLabel, y);
        y += 50;

        // Definition text
        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        const definitionLines = this.wrapText(
            doc,
            card.definition,
            pageWidth - 100
        );
        y = this.centerMultilineText(doc, definitionLines, y, 25);
        y += 40;

        // Definition images
        if (settings.includeFiles && card.files.length > 0) {
            y = await this.embedImages(
                doc,
                card.files,
                'definition',
                y,
                400,
                300
            );
            y += 20;
        }

        // Notes
        if (settings.includeNotes && card.notes.length > 0) {
            // Reset text color for notes
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'italic');

            const notesText = card.notes
                .map((note) => note.text)
                .join(' • ');
            const noteLines = this.wrapText(doc, notesText, pageWidth - 80);
            this.centerMultilineText(doc, noteLines, y, 20);
        }

        // Important indicator
        if (card.important) {
            doc.setFontSize(30);
            doc.text('⭐', pageWidth - 50, 50);
        }
    }
}
