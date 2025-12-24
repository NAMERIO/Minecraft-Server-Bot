const { Rcon } = require('rcon-client');
const { env } = require('../config/env');
const { RCON_TIMEOUT_MS } = require('../constants');

class RconService {
  async sendCommand(command) {
    const rcon = new Rcon({
      host: env.RCON_HOST,
      port: parseInt(env.RCON_PORT),
      password: env.RCON_PASSWORD,
    });

    try {
      await rcon.connect();
      const response = await Promise.race([
        rcon.send(command),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RCON timeout')), RCON_TIMEOUT_MS))
      ]);
      await rcon.end();
      return response;
    } catch (error) {
      console.error('RCON Error:', error.message);
      return null;
    }
  }

  async getServerStatus() {
    const list = await this.sendCommand('list');
    const version = await this.sendCommand('version');
    let players = 'Unknown';
    let playerList = [];
    if (list) {
      const match = list.match(/There are (\d+) of (\d+) players online: (.+)/);
      if (match) {
        players = `${match[1]}/${match[2]}`;
        playerList = match[3].split(', ');
      }
    }
    return { players, playerList, version: version || 'Unknown' };
  }
}

module.exports = new RconService();