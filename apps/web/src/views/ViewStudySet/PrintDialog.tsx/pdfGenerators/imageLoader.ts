/**
 * ImageLoader - Utility for loading and converting images for PDF embedding
 * Handles CORS, scaling, and data URL conversion for jsPDF
 */

export class ImageLoader {
    /**
     * Load image from URL and convert to data URL for jsPDF embedding
     * Handles CORS by setting crossOrigin attribute
     */
    async loadImageAsDataURL(url: string): Promise<string | null> {
        try {
            return await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;

                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            reject(new Error('Failed to get canvas context'));
                            return;
                        }

                        ctx.drawImage(img, 0, 0);

                        // Convert to data URL (JPEG for smaller file size)
                        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                        resolve(dataURL);
                    } catch (error) {
                        console.error('Error converting image to data URL:', error);
                        resolve(null);
                    }
                };

                img.onerror = () => {
                    console.error('Failed to load image:', url);
                    resolve(null); // Gracefully handle failures
                };

                img.src = url;
            });
        } catch (error) {
            console.error('Error loading image:', error);
            return null;
        }
    }

    /**
     * Calculate scaled dimensions to fit within max bounds while preserving aspect ratio
     */
    calculateScaledDimensions(
        width: number,
        height: number,
        maxWidth: number,
        maxHeight: number
    ): { width: number; height: number } {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale

        return {
            width: width * scale,
            height: height * scale,
        };
    }

    /**
     * Batch load multiple images with error handling
     * Returns a Map of URL -> data URL for successful loads
     */
    async loadImages(urls: string[]): Promise<Map<string, string>> {
        const imageMap = new Map<string, string>();

        await Promise.all(
            urls.map(async (url) => {
                const dataURL = await this.loadImageAsDataURL(url);
                if (dataURL) {
                    imageMap.set(url, dataURL);
                }
            })
        );

        return imageMap;
    }

    /**
     * Get actual image dimensions from a data URL
     */
    async getImageDimensions(
        dataURL: string
    ): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };

            img.onerror = () => {
                reject(new Error('Failed to load image for dimensions'));
            };

            img.src = dataURL;
        });
    }
}
