import { z } from 'zod';

type ValidationType = 'request' | 'response';

export interface ValidateParams<T extends z.ZodTypeAny> {
    schema: T;
    data: unknown;
    type: ValidationType;
    context?: string;
    reThrow?: boolean;
}

/**
 * Validates data against a Zod schema
 * @param params - Validation parameters
 * @param params.schema - Zod schema to validate against
 * @param params.data - Data to validate
 * @param params.type - Type of validation ('request' or 'response')
 * @param params.context - Optional context for error messages (e.g., 'GetAllStudysets')
 * @param params.reThrow - Whether to re-throw validation errors
 * @returns Validated and typed data
 */
export function validate<T extends z.ZodTypeAny>({
    schema,
    data,
    type,
    context,
    reThrow = false,
}: ValidateParams<T>): z.infer<T> {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const typeLabel = type === 'request' ? 'Request' : 'Response';
            console.error(
                `${typeLabel} validation failed${context ? ` for ${context}` : ''}:`,
                error.issues
            );
            if (reThrow) {
                throw new Error(
                    `Invalid ${type}${context ? ` for ${context}` : ''}: ${formatZodError(error)}`
                );
            }
        }
        if (reThrow) {
            throw error;
        }
    }
    // Fallback return in case of error
    return data as z.infer<T>;
}

/**
 * Safely validates data, returning result object instead of throwing
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and either data or error
 */
export function safeValidate<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Formats Zod error into a readable string
 */
function formatZodError(error: z.ZodError): string {
    return error.issues
        .map((issue) => {
            const path = issue.path.join('.');
            return `${path ? `${path}: ` : ''}${issue.message}`;
        })
        .join(', ');
}
