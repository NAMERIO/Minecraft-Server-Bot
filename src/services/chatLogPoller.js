const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const rconService = require('./rconService');

const LOG_FILE = path.join(env.LOGS_DIR, 'latest.log');

function parseChatLine(line) {
  // Chat message
  const asyncChatRegex = /^\[\d{2}:\d{2}:\d{2}\] \[Async Chat Thread - #\d+\/INFO\]: <([^>]+)> (.+)$/;
  let match = line.match(asyncChatRegex);
  if (match) {
    return { type: 'chat', player: match[1], message: match[2] };
  }
  // Join
  const joinRegex = /^\[\d{2}:\d{2}:\d{2}\] \[Server thread\/INFO\]: ([^ ]+) joined the game$/;
  match = line.match(joinRegex);
  if (match) {
    return { type: 'join', player: match[1] };
  }
  // Leave
  const leaveRegex = /^\[\d{2}:\d{2}:\d{2}\] \[Server thread\/INFO\]: ([^ ]+) left the game$/;
  match = line.match(leaveRegex);
  if (match) {
    return { type: 'leave', player: match[1] };
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
            const event = parseChatLine(line);
            if (!event) continue;
            if (event.type === 'chat') {
              await rconService.sendPublicMessage(event.player, event.message);
            } else if (event.type === 'join') {
              await rconService.sendMessageToServer(`**${event.player}** joined the game`);
            } else if (event.type === 'leave') {
              await rconService.sendMessageToServer(`**${event.player}** left the game`);
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
