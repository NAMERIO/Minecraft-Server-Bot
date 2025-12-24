const { execFile } = require('child_process');
const { env } = require('../config/env');

class SystemdService {
  async isActive() {
    return new Promise((resolve) => {
      execFile('sudo', ['systemctl', 'is-active', env.MINECRAFT_SERVICE], (error, stdout) => {
        resolve(stdout.trim() === 'active');
      });
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      execFile('sudo', ['systemctl', 'start', env.MINECRAFT_SERVICE], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      execFile('sudo', ['systemctl', 'stop', env.MINECRAFT_SERVICE], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async restart() {
    return new Promise((resolve, reject) => {
      execFile('sudo', ['systemctl', 'restart', env.MINECRAFT_SERVICE], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

module.exports = new SystemdService();