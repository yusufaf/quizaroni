import jsPDF from 'jspdf';
import { Studyset, Card, PrintConfig } from 'shared/types';
import { BasePdfGenerator } from './basePdfGenerator';

/**
 * GridPdfGenerator - Compact 2-3 cards per row in a grid layout
 * Each card shows term/definition with minimal spacing
 */
export class GridPdfGenerator extends BasePdfGenerator {
    private readonly CARDS_PER_ROW = 2;
    private readonly CARD_WIDTH = 240;
    private readonly CARD_HEIGHT = 160;
    private readonly MARGIN = 40;
    private readonly GAP = 20;

    async generate(
        studyset: Studyset,
        cards: Card[],
        settings: PrintConfig
    ): Promise<jsPDF> {
        const doc = new jsPDF('portrait', 'pt', 'letter');
        const [term1Label, term2Label] = this.getTerminology(studyset);
        const cardLabel = this.getLabelTerminology(studyset);

        // Render header
        let yPos = this.renderHeader(doc, studyset, 40);
        yPos += 20;

        let xPos = this.MARGIN;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];

            // Check if we need to start a new row
            if (i > 0 && i % this.CARDS_PER_ROW === 0) {
                xPos = this.MARGIN;
                yPos += this.CARD_HEIGHT + this.GAP;
            }

            // Check if we need a new page
            if (yPos + this.CARD_HEIGHT > 750) {
                doc.addPage();
                yPos = this.MARGIN;
                xPos = this.MARGIN;
            }

            // Render card
            this.renderCard(
                doc,
                card,
                i + 1,
                cardLabel,
                term1Label,
                term2Label,
                settings,
                xPos,
                yPos
            );

            xPos += this.CARD_WIDTH + this.GAP;
        }

        return doc;
    }

    /**
     * Render a single card in the grid
     */
    private renderCard(
        doc: jsPDF,
        card: Card,
        cardNumber: number,
        cardLabel: string,
        term1Label: string,
        term2Label: string,
        settings: PrintConfig,
        x: number,
        y: number
    ): void {
        // Draw card background and border
        if (settings.showColors && card.backgroundColor) {
            this.setFillColor(doc, card.backgroundColor);
            doc.roundedRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 3, 3, 'F');
        }

        // Draw border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.roundedRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 3, 3, 'S');

        // Set text color
        const textColor =
            settings.showColors && card.textColor ? card.textColor : '#000000';
        this.setTextColor(doc, textColor);

        let currentY = y + 20;

        // Header: Card number and important indicator
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const headerText = `${cardLabel} ${cardNumber}`;
        doc.text(headerText, x + 8, currentY);

        if (card.important) {
            doc.setFontSize(14);
            doc.text('⭐', x + this.CARD_WIDTH - 24, currentY);
        }

        currentY += 20;

        // Term label and text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(`${term1Label}:`, x + 8, currentY);
        currentY += 12;

        this.setTextColor(doc, textColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const termLines = this.wrapText(doc, card.term, this.CARD_WIDTH - 16);
        const truncatedTermLines = termLines.slice(0, 2); // Max 2 lines
        truncatedTermLines.forEach((line) => {
            if (currentY < y + this.CARD_HEIGHT - 40) {
                // Check space
                doc.text(line, x + 8, currentY);
                currentY += 13;
            }
        });

        currentY += 8;

        // Definition label and text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(`${term2Label}:`, x + 8, currentY);
        currentY += 12;

        this.setTextColor(doc, textColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const defLines = this.wrapText(
            doc,
            card.definition,
            this.CARD_WIDTH - 16
        );
        const truncatedDefLines = defLines.slice(0, 2); // Max 2 lines
        truncatedDefLines.forEach((line) => {
            if (currentY < y + this.CARD_HEIGHT - 20) {
                // Check space
                doc.text(line, x + 8, currentY);
                currentY += 13;
            }
        });

        // Categories (if space and enabled)
        if (
            settings.includeCategories &&
            card.categories.length > 0 &&
            currentY < y + this.CARD_HEIGHT - 20
        ) {
            currentY += 6;
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'italic');
            const categoriesText = card.categories.join(', ');
            const categoryLines = this.wrapText(
                doc,
                categoriesText,
                this.CARD_WIDTH - 16
            );
            const truncatedCatLines = categoryLines.slice(0, 1); // Max 1 line
            truncatedCatLines.forEach((line) => {
                if (currentY < y + this.CARD_HEIGHT - 10) {
                    doc.text(line, x + 8, currentY);
                    currentY += 10;
                }
            });
        }

        // Notes (if space and enabled)
        if (
            settings.includeNotes &&
            card.notes.length > 0 &&
            currentY < y + this.CARD_HEIGHT - 15
        ) {
            currentY += 4;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'italic');
            const notesText = card.notes.map((n) => n.text).join('; ');
            const noteLines = this.wrapText(
                doc,
                notesText,
                this.CARD_WIDTH - 16
            );
            const truncatedNoteLines = noteLines.slice(0, 1); // Max 1 line
            truncatedNoteLines.forEach((line) => {
                if (currentY < y + this.CARD_HEIGHT - 10) {
                    doc.text(line, x + 8, currentY);
                    currentY += 10;
                }
            });
        }

        // Note: Grid layout doesn't include file attachments as per plan
    }
}
