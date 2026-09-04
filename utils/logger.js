const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.resolve(__dirname, '..', 'logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(LOGS_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  }

  _write(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };

    const line = JSON.stringify(entry) + '\n';
    console.log(`[${entry.timestamp}] [${level.toUpperCase()}]: ${message}`);

    try {
      fs.appendFileSync(this.logFile, line);
    } catch (e) {
      // Ignore file write errors
    }
  }

  info(msg, meta) { this._write('info', msg, meta); }
  warn(msg, meta) { this._write('warn', msg, meta); }
  error(msg, meta) { this._write('error', msg, meta); }
  debug(msg, meta) { if (process.env.NODE_ENV !== 'production') this._write('debug', msg, meta); }
}

module.exports = new Logger();
