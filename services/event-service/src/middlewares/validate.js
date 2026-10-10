const ApiError = require('../utils/ApiError');

// Validates a request part against a zod schema.
// Body is replaced in place; query is exposed as req.validatedQuery (req.query is read-only in Express 5).
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data;
  next();
};

module.exports = validate;
