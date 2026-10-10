const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
// Exact paths only, so routes match one-to-one with the gateway's locations.
app.set('case sensitive routing', true);
app.set('strict routing', true);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(morgan(':method :url :status :response-time ms', { skip: (req) => req.url === '/health' }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
