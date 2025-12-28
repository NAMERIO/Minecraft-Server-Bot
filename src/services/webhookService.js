const axios = require('axios');
const { env } = require('../config/env');

class WebhookService {
  async sendMessage(message, username = 'Minecraft Server', avatarUrl = null) {
    if (!env.DISCORD_WEBHOOK_URL) {
      console.error('Discord webhook URL not configured');
      return false;
    }

    try {
      const payload = {
        content: message,
        username: username,
      };

      if (avatarUrl) {
        payload.avatar_url = avatarUrl;
      }

      await axios.post(env.DISCORD_WEBHOOK_URL, payload);
      return true;
    } catch (error) {
      console.error('Webhook Error:', error.message);
      return false;
    }
  }

  async sendEmbed(embed, username = 'Minecraft Server', avatarUrl = null) {
    if (!env.DISCORD_WEBHOOK_URL) {
      console.error('Discord webhook URL not configured');
      return false;
    }

    try {
      const payload = {
        embeds: [embed],
        username: username,
      };

      if (avatarUrl) {
        payload.avatar_url = avatarUrl;
      }

      await axios.post(env.DISCORD_WEBHOOK_URL, payload);
      return true;
    } catch (error) {
      console.error('Webhook Error:', error.message);
      return false;
    }
  }
}

module.exports = new WebhookService();
