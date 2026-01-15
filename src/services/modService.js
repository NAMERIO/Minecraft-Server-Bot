const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

class ModService {
  async downloadMod(url, filename) {
    if (!filename) {
      filename = path.basename(new URL(url).pathname) || 'mod.jar';
    }

    const dest = path.join(env.MODS_DIR, filename);

    if (fs.existsSync(dest)) {
      throw new Error('Mod file already exists');
    }

    const response = await axios.get(url, { responseType: 'stream', maxRedirects: 5 });
    const writer = fs.createWriteStream(dest);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
}

module.exports = new ModService();
