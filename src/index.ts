// src/index.ts

import dotenv from 'dotenv';
import { runTelegramPlugin } from './plugins/telegram';

// Load environment variables from .env
dotenv.config();

// Launch the Telegram bot
runTelegramPlugin();
