export const formatDate = (date: Date | Number | String) => {};

/**
 * Capitalizes the first letter of a string.
 */
export const capitalizeFirstLetter = (string: string) => {
    return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
};

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * @param min
 * @param max
*/
export const getRandomNumber = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}