function validateUsername(username) {
  return /^[a-zA-Z0-9_]{1,16}$/.test(username);
}

function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  validateUsername,
  validateUrl
};