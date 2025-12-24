const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const { isDomainAllowed } = require('../utils/domainWhitelist');
const { validateUrl } = require('../utils/validators');

class PluginService {
  async downloadPlugin(url) {
    if (!validateUrl(url) || !isDomainAllowed(url) || !url.endsWith('.jar')) {
      throw new Error('Invalid or untrusted URL');
    }

    const urlObj = new URL(url);
    const filename = path.basename(urlObj.pathname);
    const dest = path.join(env.PLUGINS_DIR, filename);

    if (fs.existsSync(dest)) {
      throw new Error('Plugin file already exists');
    }

    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(dest);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
}

module.exports = new PluginService();