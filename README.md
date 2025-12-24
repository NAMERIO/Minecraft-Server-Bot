# Minecraft Discord Bot

A Discord bot for managing a Minecraft server via RCON and systemd.

## Features

- **Server Status**: Check if server is online, player count, list, version.
- **RCON Commands**: Execute commands like /op, /deop, /say, /kick, /ban, /players.
- **Lifecycle Management**: Start, stop, restart server with graceful saves, confirmations, and cooldowns.
- **Plugin Management**: Download and install plugins from trusted sources, auto-restart with cooldown.
- **Logging**: View last N log lines from systemd journal.
- **Notifications**: Automatic notifications for server status changes, player join/leave, and crash alerts.
- **Security**: Role-based access, input validation, no shell exposure.
- **Stretch Goals**: Slash commands, cooldowns (5 min on dangerous commands), confirmations for stop/restart, auto-backup before restarts.

## Project Structure

```
src/
 ├── bot.js                  # Discord client setup, polling, interaction handling
 ├── constants.js            # App constants (cooldowns, timeouts, domains)
 ├── config/
 │    ├── env.js             # Environment validation
 │    └── roles.js           # Role permission helpers
 ├── services/
 │    ├── rconService.js     # RCON connection and commands
 │    ├── systemdService.js  # Systemd service management
 │    ├── pluginService.js   # Secure plugin downloads
 │    └── logService.js      # Journalctl log access
 ├── commands/
 │    ├── status.js
 │    ├── players.js
 │    ├── op.js
 │    ├── deop.js
 │    ├── say.js
 │    ├── kick.js
 │    ├── ban.js
 │    ├── start.js
 │    ├── stop.js
 │    ├── restart.js
 │    ├── addPlugin.js
 │    └── lastLogs.js
 └── utils/
     ├── cooldowns.js
     ├── confirmations.js
     ├── validators.js
     └── domainWhitelist.js
index.js                # Entry point, loads commands and starts bot
```

## Setup

1. Clone or download this repository to your Ubuntu VPS.
2. Install Node.js 16+ and wget: `sudo apt install nodejs npm`.
3. `npm install`.
4. Copy `.env.example` to `.env` and fill in the values.
5. Ensure sudo rules allow the bot user to run `systemctl` and `journalctl` for `minecraft.service`.
6. Create a systemd service to run the bot continuously:
```bash
sudo nano /etc/systemd/system/mc-discord-bot.service
```
```bash
[Unit]
Description=Minecraft Discord Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/minecraft/Minecraft-Server-Bot
ExecStart=/usr/bin/node /root/minecraft/Minecraft-Server-Bot/index.js
Restart=on-failure
EnvironmentFile=/root/minecraft/Minecraft-Server-Bot/.env

[Install]
WantedBy=multi-user.target
```
7. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mc-discord-bot
sudo systemctl start mc-discord-bot
sudo systemctl status mc-discord-bot
```
## Configuration

- `DISCORD_TOKEN`: Your Discord bot token.
- `DISCORD_CLIENT_ID`: Your Discord application ID.
- `RCON_HOST/PORT/PASSWORD`: RCON connection details.
- `ADMIN_ROLE_ID/MOD_ROLE_ID`: Discord role IDs for permissions.
- `MINECRAFT_SERVICE`: systemd service name.
- `PLUGINS_DIR`: Path to plugins directory.
- `LOGS_DIR`: Path to logs (used for journalctl).
- `NOTIFICATION_CHANNEL_ID`: Channel for notifications.
- `BACKUP_SCRIPT`: Optional path to backup script (executed before restarts).

## Security Decisions

- **No Shell Interpolation**: All commands use `execFile` with argument arrays to prevent injection.
- **Domain Whitelisting**: Exact hostname matching against allowed domains, no partial matches.
- **Input Validation**: Strict regex for usernames, URL validation.
- **File Overwrite Prevention**: Checks if plugin JAR exists before download.
- **RCON Timeouts**: Prevents hanging on offline servers.
- **Sudo Usage**: Assumes configured sudo rules for systemctl/journalctl, no password prompts.
- **Environment Validation**: Fails startup on missing/invalid env vars.
- **Ephemeral Responses**: Sensitive outputs are ephemeral where appropriate.

## How It Works

- **Modular Architecture**: Separated concerns into services, commands, utils, and config for maintainability.
- **RCON Service**: Handles secure command execution with timeouts and error handling.
- **Systemd Service**: Uses `execFile` with `sudo` for service control, no shell interpolation.
- **Plugin Service**: Downloads via HTTP client (axios), validates domains exactly, prevents overwrites.
- **Polling**: Checks status every minute for notifications and crash detection using proper timestamp.
- **Confirmations**: Button-based prompts for destructive actions.
- **Cooldowns**: 5-minute limits on dangerous commands.
- **Backups**: Runs optional backup script before restarts.

## Hardening

- Run bot as non-root user with minimal permissions.
- Use PM2 for process management and auto-restart.
- Monitor logs and set up alerts.
- Regularly update dependencies.
- Audit code for vulnerabilities.

## Future Improvements

- MOTD retrieval (read from server.properties).
- More RCON commands.
- Web dashboard.
- Advanced logging filters.
- Multi-server support.