# Translator Bot

A Telegram bot that automatically translates messages between Indonesian and English.

## Features

- Automatic language detection
- Translates Indonesian/Malay to English and vice versa
- Uses Telegram's MTProto API with fallback to Google Translate
- Handles long messages by splitting into chunks

## Requirements

- Bun runtime
- Telegram Bot Token
- Telegram API credentials (API ID and API Hash)
- Active Telegram session

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
BOT_TOKEN=your_bot_token
API_HASH=your_api_hash
API_ID=your_api_id
SESSION=your_session_string
```

## Usage

Development mode with hot reload:
```bash
bun --watch .
```

Build for production:
```bash
bun run build
```

Run production build:
```bash
bun start
```

## Docker

Build and run with Docker:
```bash
docker build -t translator-bot .
docker run --env-file .env translator-bot
```

## License

Private
