import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Studyset, Card, PrintConfig } from 'shared/types';
import { BasePdfGenerator } from './basePdfGenerator';

/**
 * ListPdfGenerator - Two-column table layout using jsPDF-AutoTable
 * Each card is a row with Term | Definition columns
 */
export class ListPdfGenerator extends BasePdfGenerator {
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

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];

            // Check if we need a new page
            const estimatedHeight = await this.estimateCardHeight(
                card,
                settings
            );
            yPos = this.checkPageSpace(doc, yPos, estimatedHeight, 40);

            // Render card using AutoTable
            yPos = await this.renderCard(
                doc,
                card,
                i + 1,
                cardLabel,
                term1Label,
                term2Label,
                settings,
                yPos
            );

            yPos += 15; // Spacing between cards
        }

        return doc;
    }

    /**
     * Render a single card as a two-column table
     */
    private async renderCard(
        doc: jsPDF,
        card: Card,
        cardNumber: number,
        cardLabel: string,
        term1Label: string,
        term2Label: string,
        settings: PrintConfig,
        startY: number
    ): Promise<number> {
        const tableWidth = 500;
        const columnWidth = tableWidth / 2;
        const startX = (doc.internal.pageSize.getWidth() - tableWidth) / 2;

        // Determine colors
        const headerFillColor =
            settings.showColors && card.backgroundColor
                ? this.hexToRgb(card.backgroundColor)
                : { r: 245, g: 245, b: 245 };

        const headerTextColor =
            settings.showColors && card.textColor
                ? this.hexToRgb(card.textColor)
                : { r: 0, g: 0, b: 0 };

        // Prepare table data
        const tableData = [[card.term, card.definition]];

        // Generate table
        autoTable(doc, {
            startY: startY,
            margin: { left: startX },
            tableWidth: tableWidth,
            head: [
                [
                    `${cardLabel} ${cardNumber}${card.important ? ' ⭐' : ''}`,
                    '',
                ],
            ],
            body: [
                [
                    {
                        content: `${term1Label}:\n${card.term}`,
                        styles: { cellPadding: 8 },
                    },
                    {
                        content: `${term2Label}:\n${card.definition}`,
                        styles: { cellPadding: 8 },
                    },
                ],
            ],
            theme: 'grid',
            columnStyles: {
                0: { cellWidth: columnWidth },
                1: { cellWidth: columnWidth },
            },
            headStyles: {
                fillColor: [
                    headerFillColor.r,
                    headerFillColor.g,
                    headerFillColor.b,
                ],
                textColor: [
                    headerTextColor.r,
                    headerTextColor.g,
                    headerTextColor.b,
                ],
                fontSize: 12,
                fontStyle: 'bold',
                halign: 'left',
            },
            bodyStyles: {
                fontSize: 11,
                cellPadding: 8,
            },
            styles: {
                lineColor: [200, 200, 200],
                lineWidth: 0.5,
            },
        });

        // Get final Y position after table
        let finalY = (doc as any).lastAutoTable.finalY;

        // Render categories below table
        if (settings.includeCategories && card.categories.length > 0) {
            finalY += 8;
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            const categoriesText = 'Categories: ' + card.categories.join(', ');
            const categoryLines = this.wrapText(
                doc,
                categoriesText,
                tableWidth - 20
            );
            categoryLines.forEach((line) => {
                doc.text(line, startX + 10, finalY);
                finalY += 12;
            });
        }

        // Render notes below categories
        if (settings.includeNotes && card.notes.length > 0) {
            finalY += 8;
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'italic');
            const notesText =
                'Notes: ' + card.notes.map((n) => n.text).join('; ');
            const noteLines = this.wrapText(doc, notesText, tableWidth - 20);
            noteLines.forEach((line) => {
                doc.text(line, startX + 10, finalY);
                finalY += 12;
            });
        }

        // Render images if enabled
        if (settings.includeFiles && card.files.length > 0) {
            finalY += 10;

            const termFiles = card.files.filter(
                (f) => f.association === 'term'
            );
            const defFiles = card.files.filter(
                (f) => f.association === 'definition'
            );

            // Render term images on left
            if (termFiles.length > 0) {
                const imageY = await this.renderImagesInColumn(
                    doc,
                    termFiles,
                    startX + 10,
                    finalY,
                    columnWidth - 20
                );
                finalY = Math.max(finalY, imageY);
            }

            // Render definition images on right
            if (defFiles.length > 0) {
                const imageY = await this.renderImagesInColumn(
                    doc,
                    defFiles,
                    startX + columnWidth + 10,
                    finalY,
                    columnWidth - 20
                );
                finalY = Math.max(finalY, imageY);
            }

            if (termFiles.length > 0 || defFiles.length > 0) {
                finalY += 10;
            }
        }

        return finalY;
    }

    /**
     * Render images in a vertical column
     */
    private async renderImagesInColumn(
        doc: jsPDF,
        files: any[],
        x: number,
        startY: number,
        maxWidth: number
    ): Promise<number> {
        let y = startY;
        const maxHeight = 150;

        for (const file of files) {
            try {
                const height = await this.embedImageAt(
                    doc,
                    file.downloadURL,
                    x,
                    y,
                    maxWidth,
                    maxHeight
                );
                y += height + 10;
            } catch (error) {
                console.error('Failed to embed image:', error);
            }
        }

        return y;
    }

    /**
     * Estimate the height a card will take (for pagination)
     */
    private async estimateCardHeight(
        card: Card,
        settings: PrintConfig
    ): Promise<number> {
        let height = 100; // Base table height

        if (settings.includeCategories && card.categories.length > 0) {
            height += 20;
        }

        if (settings.includeNotes && card.notes.length > 0) {
            height += 20 + card.notes.length * 12;
        }

        if (settings.includeFiles && card.files.length > 0) {
            height += card.files.length * 160; // Approximate image height
        }

        return height;
    }
}
