const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Prefer an explicit statusCode set on the error (thrown by HTTP-agnostic
  // helpers), then fall back to whatever the handler set via res.status().
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    message: err.message,
    // Never expose stack traces — they reveal file paths and architecture
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
