// Import the required libraries
const { Telegraf } = require('telegraf')
require('dotenv').config()

// Fetch the bot token from our hidden environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN

if (!botToken) {
  console.error('Error: TELEGRAM_BOT_TOKEN is missing in your .env file!')
  process.exit(1)
}

// Initialize the bot instance
const bot = new Telegraf(botToken)

// Define what happens when a user types /start
bot.start((ctx) => {
  // ctx stands for context; it contains details about the incoming message
  const firstName = ctx.from.first_name || 'there'
  ctx.reply(
    `Hello ${firstName}! Welcome to MotivateMe. Soon, I will track your goals daily!`,
  )
})

// Launch the bot to start listening for messages
bot
  .launch()
  .then(() => console.log('🚀 MotivateMe Bot is successfully running locally!'))
  .catch((err) => console.error('Failed to start the bot:', err))

// Enable graceful stop to safely close connections when you shut down the script
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
