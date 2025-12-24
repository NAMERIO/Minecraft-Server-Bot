const { execFile } = require('child_process');
const { env } = require('../config/env');

class LogService {
  async getLastLogs(lines = 10) {
    return new Promise((resolve, reject) => {
      execFile('sudo', ['journalctl', '-u', env.MINECRAFT_SERVICE, '-n', lines.toString(), '--no-pager'], (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
}

module.exports = new LogService();