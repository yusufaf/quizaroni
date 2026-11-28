import { PreferredDateFormat, PreferredTimeFormat } from 'shared/types';
import { DATE_FORMATS, TIME_FORMATS } from '../constants';

export const getFormattedTimestamp = (): string => {
    const isoString = new Date().toISOString();

    // Always YYYY-MM-DDTHH:MM:SS.sssZ; the defaults just keep this total.
    const [datePart = '', timePart = ''] = isoString.split('T');

    // Format the date part (YYYY-MM-DD) to (YYYY_MM_DD)
    const formattedDate = datePart.replace(/-/g, '_');

    // Format the time part (HH:MM:SS.sssZ) to (HH_MM_SS)
    const formattedTime = (timePart.split('.')[0] ?? '').replace(/:/g, '_');

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

/**
 * Downloads `content` as a file through a temporary link, then releases the
 * object URL so the blob does not stay in memory until the page closes.
 * This is the only place that should build a download link.
 */
export const downloadFile = (
    content: string,
    fileName: string,
    mimeType: string
) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = fileName;
    anchor.href = url;
    anchor.click();
    anchor.remove();
    // Revoke on the next tick so the browser has started the download first.
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

export const downloadObjectAsJSON = (data: object, fileName: string) => {
    downloadFile(JSON.stringify(data, null, 4), fileName, 'application/json');
};

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDateUsingPreferred = (
    value: string,
    dateFormat: PreferredDateFormat,
    timeFormat: PreferredTimeFormat = TIME_FORMATS.TWELVE_HOUR,
    showSeconds: boolean = false
): string => {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return '';
    let formattedDate: string = value;
    switch (dateFormat) {
        case DATE_FORMATS.ISO_8601:
            formattedDate = dateValue.toISOString().split('T')[0] ?? value;
            break;
        case DATE_FORMATS.MDY:
            formattedDate = dateValue.toLocaleDateString('en-US');
            break;
        case DATE_FORMATS.DMY:
            formattedDate = dateValue.toLocaleDateString('en-GB');
            break;
        default:
            console.error(`Unsupported format: ${dateFormat}`);
    }

    const is12Hour = timeFormat === TIME_FORMATS.TWELVE_HOUR;
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        ...(showSeconds && { second: '2-digit' }),
        hour12: is12Hour,
    };
    const formattedTime = dateValue.toLocaleTimeString('en-US', timeOptions);

    return `${formattedDate} ${formattedTime}`;
};
