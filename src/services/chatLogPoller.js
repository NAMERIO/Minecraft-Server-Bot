const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const rconService = require('./rconService');

const LOG_FILE = path.join(env.LOGS_DIR, 'latest.log');

function parseChatLine(line) {
  const asyncChatRegex = /^\[\d{2}:\d{2}:\d{2}\] \[Async Chat Thread - #\d+\/INFO\]: <([^>]+)> (.+)$/;
  const match = line.match(asyncChatRegex);
  if (match) {
    return { player: match[1], message: match[2] };
  }
  return null;
}

function startLogWatcher() {
  let buffer = '';
  let lastSize = 0;
  if (!fs.existsSync(LOG_FILE)) return;
  lastSize = fs.statSync(LOG_FILE).size;
  fs.watch(LOG_FILE, (eventType) => {
    if (eventType !== 'change') return;
    try {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size < lastSize) {
        lastSize = 0;
      }
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(LOG_FILE, {
          start: lastSize,
          end: stats.size
        });
        let chunkBuffer = '';
        stream.on('data', chunk => {
          chunkBuffer += chunk.toString();
        });
        stream.on('end', async () => {
          const lines = chunkBuffer.split(/\r?\n/);
          for (const line of lines) {
            const chat = parseChatLine(line);
            if (chat) {
              await rconService.sendPublicMessage(chat.player, chat.message);
            }
          }
        });
        lastSize = stats.size;
      }
    } catch (err) {
      console.error('Chat log watcher error:', err);
    }
  });
}

module.exports = { startLogWatcher };
