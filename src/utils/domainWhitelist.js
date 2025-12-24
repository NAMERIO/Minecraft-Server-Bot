const { ALLOWED_DOMAINS } = require('../constants');

function isDomainAllowed(url) {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

module.exports = {
  isDomainAllowed
};