const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const servedBy = require('./middlewares/servedBy');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(servedBy);
app.use(express.json({ limit: '100kb' }));
app.use(morgan(':method :url :status :response-time ms', { skip: (req) => req.url === '/health' }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
