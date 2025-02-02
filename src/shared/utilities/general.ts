import { PreferredDateFormat } from 'shared/types';
import { DATE_FORMATS, MIME_TYPES } from '../constants';

export const getFormattedTimestamp = (): string => {
    const isoString = new Date().toISOString();

    const [datePart, timePart] = isoString.split('T');

    // Format the date part (YYYY-MM-DD) to (YYYY_MM_DD)
    const formattedDate = datePart.replace(/-/g, '_');

    // Format the time part (HH:MM:SS.sssZ) to (HH_MM_SS)
    const formattedTime = timePart.split('.')[0].replace(/:/g, '_');

    return `${formattedDate}_${formattedTime}`;
};

/**
 * Capitalizes the first letter of a string.
 */
export const capitalizeFirstLetter = (string: string): string => {
    return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
};

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * @param min
 * @param max
 */
export const getRandomNumber = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
};

export const downloadObjectAsJSON = (data: Object, fileName: string) => {
    const jsonData = JSON.stringify(data, null, 4);
    const blob = new Blob([jsonData], { type: MIME_TYPES.JSON });
    const anchor = document.createElement('a');
    anchor.download = fileName;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
    anchor.remove();
};

export const formatDateUsingPreferred = (
    value: string,
    format: PreferredDateFormat
): string => {
    const dateValue = new Date(value);
    let formattedValue: string = value;

    switch (format) {
        case DATE_FORMATS.ISO_8601:
            formattedValue = dateValue.toISOString().split('T')[0] ?? value;
            break;
        case DATE_FORMATS.MDY:
            formattedValue = dateValue.toLocaleDateString('en-US');
            break;
        case DATE_FORMATS.DMY:
            formattedValue = dateValue.toLocaleDateString('en-GB');
            break;
        default:
            console.error(`Unsupported format: ${format}`);
    }

    return `${formattedValue} ${dateValue.toLocaleTimeString()}`;
};
