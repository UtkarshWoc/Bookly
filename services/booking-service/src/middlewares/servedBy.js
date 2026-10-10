const os = require('os');

// Tags every response with the replica that handled it, which makes the
// gateway's round-robin load balancing visible to clients.
const instance = os.hostname();

function servedBy(_req, res, next) {
  res.set('X-Served-By', `booking-service@${instance}`);
  next();
}

module.exports = servedBy;
