// Legacy passport middleware — kept as no-op for import compatibility.
// Firebase Authentication handles all auth now.
module.exports = { initialize: () => (req, res, next) => next() };
