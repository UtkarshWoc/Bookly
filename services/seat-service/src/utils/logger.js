const SERVICE = 'seat-service';

function log(level, message) {
  const line = `${new Date().toISOString()} [${SERVICE}] ${level.toUpperCase()} ${message}`;
  (level === 'error' ? console.error : console.log)(line);
}

module.exports = {
  info: (msg) => log('info', msg),
  warn: (msg) => log('warn', msg),
  error: (msg) => log('error', msg),
};
