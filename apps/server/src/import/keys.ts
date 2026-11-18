/** A key that could leave the sync folder, or isn't a plain relative path. */
export function isUnsafeS3Key(key: string): boolean {
    return (
        /[\\\0]/.test(key) ||
        key.split('/').some((p) => p === '' || p === '.' || p === '..')
    );
}
