const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

class PluginService {
  async downloadPlugin(url) {
    if (!url.endsWith('.jar')) {
      throw new Error('URL must point to a .jar file');
    }

    const filename = path.basename(new URL(url).pathname);
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