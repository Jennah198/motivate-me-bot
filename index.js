require('./cron') // Spines up the daily broadcast web listener alongside the bot
const { Telegraf } = require('telegraf')
const { saveUserDates, getUser } = require('./db')
const { calculateProgress, getRandomQuote } = require('./utils')
require('dotenv').config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

// Simple local object to keep track of a user's conversational state
// Structure: { chat_id: { step: 'AWAITING_START_DATE', startDate: '...' } }
const userStates = {}

// Regex pattern to check if text matches YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// 1. Handshake Command (/start)
bot.start(async (ctx) => {
  const chatId = ctx.chat.id

  // Reset state if they re-run start
  userStates[chatId] = { step: 'AWAITING_START_DATE' }

  await ctx.reply(
    '👋 Welcome to MotivateMe!\n\n' +
      "Let's set up your dynamic milestone window. " +
      'Please enter your **Start Date** in this exact format: `YYYY-MM-DD` (e.g., 2026-06-14)',
    { parse_mode: 'Markdown' },
  )
})

// 2. Fallback check command (/status) so a user can see their current stats
bot.command('status', async (ctx) => {
  const chatId = ctx.chat.id
  const user = await getUser(chatId)

  if (!user) {
    return ctx.reply(
      "You haven't initialized a timeline yet! Send /start to get going.",
    )
  }

  const result = calculateProgress(user.start_date, user.end_date)
  const quote = getRandomQuote()

  ctx.reply(
    `✨ *Your Current Progress* ✨\n\n` +
      `"${quote}"\n\n` +
      `📊 You have consumed *${result.percentage}%* of your timeline!`,
    { parse_mode: 'Markdown' },
  )
})

// 3. Main Message Handler (Processes conversational date inputs)
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id
  const text = ctx.message.text.trim()
  const state = userStates[chatId]

  // If the user isn't actively setting up dates, ignore or handle standard requests
  if (!state) {
    return ctx.reply(
      "I didn't quite catch that. Type /status to see your timeline or /start to rebuild it!",
    )
  }

  // STEP A: Handling Start Date Input
  if (state.step === 'AWAITING_START_DATE') {
    if (!DATE_REGEX.test(text)) {
      return ctx.reply(
        '❌ Invalid format. Please supply your start date precisely as `YYYY-MM-DD` (e.g., 2026-06-14)',
      )
    }

    state.startDate = text
    state.step = 'AWAITING_END_DATE'
    return ctx.reply(
      '✅ Start Date recorded! Now, enter your **End Date** in the same `YYYY-MM-DD` format:',
    )
  }

  // STEP B: Handling End Date Input
  if (state.step === 'AWAITING_END_DATE') {
    if (!DATE_REGEX.test(text)) {
      return ctx.reply(
        '❌ Invalid format. Please supply your end date precisely as `YYYY-MM-DD` (e.g., 2026-09-14)',
      )
    }

    const startDateStr = state.startDate
    const endDateStr = text

    // Use our Phase 2 utility to validate chronological order
    const evaluation = calculateProgress(startDateStr, endDateStr)
    if (!evaluation.success) {
      return ctx.reply(
        `❌ Configuration Error: ${evaluation.error}. Let's start over. Send /start to retry.`,
      )
    }

    // Save configuration parameters permanently to Supabase cloud
    await ctx.reply(
      '⏳ Syncing your profile details securely to our servers...',
    )
    const saveResult = await saveUserDates(chatId, startDateStr, endDateStr)

    if (saveResult.success) {
      // Clear wizard memory state
      delete userStates[chatId]

      await ctx.reply(
        '🎉 *Setup Complete!* \n\n' +
          'Your timeline metrics have been successfully saved. I will track your progress daily! ' +
          'You can check your status anytime by typing `/status`.',
        { parse_mode: 'Markdown' },
      )
    } else {
      ctx.reply(
        '⚠️ Critical storage issue occurred while writing profile data. Please try again later.',
      )
    }
  }
})

bot.launch().then(() => console.log('🚀 Phase 3 Bot Engine Activated Locally!'))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
