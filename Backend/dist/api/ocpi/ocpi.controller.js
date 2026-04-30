/**
 * Placeholder for retrieving OCPI locations
 */
export const getLocations = async (req, res) => {
    res.status(501).json({
        success: false,
        message: "OCPI integration is not implemented yet. Ready for future OCPI endpoints.",
    });
};
/**
 * Placeholder for retrieving OCPI tariffs
 */
export const getTariffs = async (req, res) => {
    res.status(501).json({
        success: false,
        message: "OCPI tariffs integration is not implemented yet.",
    });
};
