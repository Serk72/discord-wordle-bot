# discord-wordle-bot
[![GitHub Release](https://img.shields.io/github/release/Serk72/discord-wordle-bot.svg?logo=github)](https://github.com/Serk72/discord-wordle-bot/releases)
[![Build Status](https://github.com/Serk72/discord-wordle-bot/actions/workflows/main.yml/badge.svg)](https://github.com/Serk72/discord-wordle-bot/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/Serk72/discord-wordle-bot/blob/main/LICENSE)
[![Coverage Status](https://codecov.io/github/Serk72/discord-wordle-bot/branch/main/graph/badge.svg)](https://codecov.io/github/Serk72/discord-wordle-bot)
[![CodeQL](https://github.com/Serk72/discord-wordle-bot/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Serk72/discord-wordle-bot/actions/workflows/codeql-analysis.yml)
[![Downloads](https://img.shields.io/github/downloads/Serk72/discord-wordle-bot/total?logo=github)](https://github.com/Serk72/discord-wordle-bot/releases)

Discord bot for monitoring a channel for wordle scores

### Config
This application is configured using https://github.com/node-config/node-config and can be changed to use `local.json` files for local config or `NODE_ENV` config files.
#### Config File

| Config name                    | JSON Type | Description | Default |
|--------------------------------|-----------|-------------|---------|
| `wordleMonitorChannelID`       | String    | The channel ID on discord that will be monitored for wordle scores and is where the bot will send messages |  |
| `insultUserName`               | String    | Discord username that is specified will get a random insult generated if they are the last to complete the wordle for the day. |  |
| `discordBotToken`              | String    | Bot token from discord giving the bot access to discord apis. |  |
| `postgres`                     | Object    | Database connection Info |  | 
| `postgres.connectionString`    | String    | Full connection string to the postgres database.                              |  |
| `postgres.password`            | String    | Password for the database   |  |
| `postgres.database`            | String    | Database name                  | ` |
| `postgres.user`                | String    | Database user  | |
| `postgres.host`                | String    | Database host name, no http/https:// |  |
| `postgres.port`                | Int       | port                          | |
| `footerMessage`                | String    | If specified, footer that will be sent will all bot messages. |  |

#### Example Config
```json
{
    "wordleMonitorChannelID": "A changel id number",
    "insultUserName": "a discord username",
    "discordBotToken": "a discord bot token",
    "postgres": {
        "connectionString": "a connection string",
        "password": "a password",
        "database": "postgres",
        "user": "postgres",
        "host": "a hostname",
        "port": 5432
    },
    "footerMessage": "a footer message"
}
```


### Helm

Helm instuctions to come
The current helm files are not fully configurable.
This project currently depends on an independently configured postgress database and if deployed through helm depend on existing persistance items to be set up.