// Shared business thresholds. Keep these here (not inline) so the order-time
// low-stock alert, the dashboard query, and the API response all agree on one
// value instead of three copies of the literal drifting apart.

// A product at or below this stock level is flagged as "low stock".
const LOW_STOCK_THRESHOLD = 5;

module.exports = { LOW_STOCK_THRESHOLD };
