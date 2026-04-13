import jsPDF from 'jspdf';
import { Studyset, Card, PrintConfig, CardFileMetadata } from 'shared/types';
import { ImageLoader } from './imageLoader';

/**
 * BasePdfGenerator - Abstract base class for PDF generation
 * Provides shared utilities for color conversion, text handling, and image embedding
 */
export abstract class BasePdfGenerator {
    protected imageLoader = new ImageLoader();

    /**
     * Generate PDF document from studyset data
     * Must be implemented by subclasses
     */
    abstract generate(
        studyset: Studyset,
        cards: Card[],
        settings: PrintConfig
    ): Promise<jsPDF>;

    // #region Color Utilities

    /**
     * Convert hex color to RGB values
     */
    protected hexToRgb(hex: string): { r: number; g: number; b: number } {
        // Remove # if present
        const cleanHex = hex.replace('#', '');

        // Parse hex values
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);

        return { r, g, b };
    }

    /**
     * Set text color from hex value
     */
    protected setTextColor(doc: jsPDF, hexColor: string): void {
        try {
            const { r, g, b } = this.hexToRgb(hexColor);
            doc.setTextColor(r, g, b);
        } catch (error) {
            console.error('Invalid hex color:', hexColor);
            doc.setTextColor(0, 0, 0); // Fallback to black
        }
    }

    /**
     * Fill entire page with background color
     */
    protected fillPageBackground(doc: jsPDF, hexColor: string): void {
        try {
            const { r, g, b } = this.hexToRgb(hexColor);
            doc.setFillColor(r, g, b);
            doc.rect(
                0,
                0,
                doc.internal.pageSize.getWidth(),
                doc.internal.pageSize.getHeight(),
                'F'
            );
        } catch (error) {
            console.error('Invalid background color:', hexColor);
        }
    }

    /**
     * Set fill color from hex value
     */
    protected setFillColor(doc: jsPDF, hexColor: string): void {
        try {
            const { r, g, b } = this.hexToRgb(hexColor);
            doc.setFillColor(r, g, b);
        } catch (error) {
            console.error('Invalid fill color:', hexColor);
            doc.setFillColor(255, 255, 255); // Fallback to white
        }
    }

    // #endregion

    // #region Text Utilities

    /**
     * Wrap text to fit within max width
     * Returns array of lines
     */
    protected wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
        return doc.splitTextToSize(text, maxWidth);
    }

    /**
     * Center text horizontally on page
     */
    protected centerText(doc: jsPDF, text: string, y: number): void {
        const pageWidth = doc.internal.pageSize.getWidth();
        const textWidth = doc.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
    }

    /**
     * Center multiline text horizontally on page
     */
    protected centerMultilineText(
        doc: jsPDF,
        lines: string[],
        startY: number,
        lineHeight: number = 20
    ): number {
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = startY;

        lines.forEach((line) => {
            const textWidth = doc.getTextWidth(line);
            const x = (pageWidth - textWidth) / 2;
            doc.text(line, x, y);
            y += lineHeight;
        });

        return y;
    }

    /**
     * Render text within a box with automatic wrapping
     */
    protected renderTextInBox(
        doc: jsPDF,
        text: string,
        x: number,
        y: number,
        maxWidth: number
    ): number {
        const lines = this.wrapText(doc, text, maxWidth);
        const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;

        lines.forEach((line, index) => {
            doc.text(line, x, y + index * lineHeight);
        });

        return y + lines.length * lineHeight;
    }

    // #endregion

    // #region Image Utilities

    /**
     * Embed images associated with a specific field (term/definition)
     * Returns the Y position after rendering all images
     */
    protected async embedImages(
        doc: jsPDF,
        files: CardFileMetadata[],
        association: 'term' | 'definition',
        startY: number,
        maxWidth: number = 200,
        maxHeight: number = 200
    ): Promise<number> {
        const associatedFiles = files.filter(
            (file) => file.association === association
        );

        if (associatedFiles.length === 0) {
            return startY;
        }

        let currentY = startY;
        const pageWidth = doc.internal.pageSize.getWidth();

        for (const file of associatedFiles) {
            try {
                const dataURL = await this.imageLoader.loadImageAsDataURL(
                    file.downloadURL
                );

                if (!dataURL) continue;

                const dimensions =
                    await this.imageLoader.getImageDimensions(dataURL);
                const scaled = this.imageLoader.calculateScaledDimensions(
                    dimensions.width,
                    dimensions.height,
                    maxWidth,
                    maxHeight
                );

                // Center image horizontally
                const x = (pageWidth - scaled.width) / 2;

                doc.addImage(
                    dataURL,
                    'JPEG',
                    x,
                    currentY,
                    scaled.width,
                    scaled.height
                );

                currentY += scaled.height + 10; // Add spacing after image
            } catch (error) {
                console.error('Failed to embed image:', error);
                // Continue with next image
            }
        }

        return currentY;
    }

    /**
     * Embed image at specific coordinates with max dimensions
     */
    protected async embedImageAt(
        doc: jsPDF,
        url: string,
        x: number,
        y: number,
        maxWidth: number,
        maxHeight: number
    ): Promise<number> {
        try {
            const dataURL = await this.imageLoader.loadImageAsDataURL(url);
            if (!dataURL) return 0;

            const dimensions =
                await this.imageLoader.getImageDimensions(dataURL);
            const scaled = this.imageLoader.calculateScaledDimensions(
                dimensions.width,
                dimensions.height,
                maxWidth,
                maxHeight
            );

            doc.addImage(dataURL, 'JPEG', x, y, scaled.width, scaled.height);

            return scaled.height;
        } catch (error) {
            console.error('Failed to embed image:', error);
            return 0;
        }
    }

    // #endregion

    // #region Terminology Utilities

    /**
     * Get custom terminology for term/definition labels
     * Returns [term1, term2] e.g., ["Question", "Answer"]
     */
    protected getTerminology(studyset: Studyset): [string, string] {
        const terminology = studyset.metadata?.customTerminology;

        if (!terminology || terminology === 'default') {
            return ['Term', 'Definition'];
        }

        // Parse custom terminology (format: "Term1/Term2")
        const parts = terminology.split('/');
        if (parts.length === 2) {
            return [parts[0].trim(), parts[1].trim()];
        }

        return ['Term', 'Definition'];
    }

    /**
     * Get label terminology for card numbering
     * e.g., "Card", "Question", "Item"
     */
    protected getLabelTerminology(studyset: Studyset): string {
        const labelTerminology = studyset.metadata?.customLabelTerminology;

        if (!labelTerminology || labelTerminology === 'default') {
            return 'Card';
        }

        return labelTerminology;
    }

    // #endregion

    // #region Category Utilities

    /**
     * Render category chips/badges
     */
    protected renderCategories(
        doc: jsPDF,
        categories: string[],
        x: number,
        y: number,
        maxWidth: number
    ): number {
        if (categories.length === 0) return y;

        const fontSize = 10;
        const padding = 4;
        const chipHeight = fontSize + padding * 2;
        const gap = 6;

        doc.setFontSize(fontSize);
        doc.setTextColor(100, 100, 100);

        let currentX = x;
        let currentY = y;

        categories.forEach((category) => {
            const textWidth = doc.getTextWidth(category);
            const chipWidth = textWidth + padding * 2;

            // Check if chip fits on current line
            if (currentX + chipWidth > x + maxWidth) {
                currentX = x;
                currentY += chipHeight + gap;
            }

            // Draw chip background
            doc.setFillColor(240, 240, 240);
            doc.roundedRect(
                currentX,
                currentY,
                chipWidth,
                chipHeight,
                2,
                2,
                'F'
            );

            // Draw text
            doc.text(category, currentX + padding, currentY + fontSize);

            currentX += chipWidth + gap;
        });

        return currentY + chipHeight + 10;
    }

    // #endregion

    // #region Page Utilities

    /**
     * Check if content fits on current page, add new page if needed
     */
    protected checkPageSpace(
        doc: jsPDF,
        currentY: number,
        requiredHeight: number,
        margin: number = 40
    ): number {
        const pageHeight = doc.internal.pageSize.getHeight();

        if (currentY + requiredHeight > pageHeight - margin) {
            doc.addPage();
            return margin; // Return top margin for new page
        }

        return currentY;
    }

    /**
     * Render studyset header (title and description)
     */
    protected renderHeader(
        doc: jsPDF,
        studyset: Studyset,
        startY: number = 40
    ): number {
        let y = startY;

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        this.centerText(doc, studyset.title, y);
        y += 20;

        // Description
        if (studyset.description) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const descLines = this.wrapText(
                doc,
                studyset.description,
                doc.internal.pageSize.getWidth() - 80
            );
            y = this.centerMultilineText(doc, descLines, y, 15);
            y += 10;
        }

        return y;
    }

    // #endregion
}
