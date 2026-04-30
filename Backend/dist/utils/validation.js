/**
 * Safely parses an integer from a value, with a default and optional range constraints.
 */
export const parseInteger = (value, defaultValue, min, max) => {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        return defaultValue;
    }
    if (min !== undefined && parsed < min) {
        return min;
    }
    if (max !== undefined && parsed > max) {
        return max;
    }
    return parsed;
};
/**
 * Specifically for parsing pagination parameters.
 */
export const parsePagination = (queryPage, queryLimit) => {
    const page = parseInteger(queryPage, 1, 1);
    const limit = parseInteger(queryLimit, 50, 1, 100);
    return { page, limit };
};
/**
 * Specifically for parsing ID parameters.
 * Returns null if the ID is not a valid positive integer.
 */
export const parseId = (id) => {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};
