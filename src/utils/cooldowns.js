const { COOLDOWN_MS } = require('../constants');

const cooldowns = new Map();

function checkCooldown(userId, command) {
  const userCooldowns = cooldowns.get(userId) || {};
  const lastUsed = userCooldowns[command];
  if (lastUsed && Date.now() - lastUsed < COOLDOWN_MS) {
    return Math.ceil((COOLDOWN_MS - (Date.now() - lastUsed)) / 1000);
  }
  return 0;
}

function setCooldown(userId, command) {
  const userCooldowns = cooldowns.get(userId) || {};
  userCooldowns[command] = Date.now();
  cooldowns.set(userId, userCooldowns);
}

module.exports = {
  checkCooldown,
  setCooldown
};