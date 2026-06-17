const { Telegraf, Markup } = require('telegraf') // 🛠️ Added Markup for UI buttons
const { saveUserDates, getUser } = require('./db')
const { calculateProgress, getRandomQuote } = require('./utils')
require('./cron') // Ensures the Express server runs simultaneously
require('dotenv').config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

const userStates = {}
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// 🌟 NEW: Persistent Custom Keyboard Buttons for everyday use
const mainDashboardKeyboard = Markup.keyboard([
  ['📊 Check My Progress'],
  ['🔄 Restart/Update My Timeline'],
]).resize() // .resize() makes the buttons clean and compact on mobile screens

// 🚀 ON LAUNCH: Configure Bot Profile & Commands automatically
bot.telegram
  .setMyDescription(
    'Welcome to MotivateMe! ☀️\n\n' +
      'This bot tracks your custom milestones (like summer, semesters, or personal challenges) ' +
      "and sends you daily motivational fuel along with the exact percentage of time you've consumed so far.",
  )
  .catch((err) => console.error('Failed to set bot description:', err))

bot.telegram
  .setMyCommands([
    {
      command: 'start',
      description: 'Initialize or update your target tracking timeline',
    },
    {
      command: 'status',
      description: 'Instantly view your current milestone completion status',
    },
  ])
  .catch((err) => console.error('Failed to set menu commands:', err))

// 1. Handshake Command (/start)
bot.start(async (ctx) => {
  const chatId = ctx.chat.id
  userStates[chatId] = { step: 'AWAITING_START_DATE' }

  // Hide the main dashboard keyboard while they are typing dates so they don't get distracted
  await ctx.reply(
    '👋 *Welcome to MotivateMe!*\n\n' +
      "Let's configure your tracking window. " +
      'Please reply by entering your **Start Date** in this exact format:\n\n' +
      '`YYYY-MM-DD` (e.g., 2026-06-14)',
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
  )
})

// 2. Core Status Check Logic
async function handleStatusRequest(ctx) {
  const chatId = ctx.chat.id
  const user = await getUser(chatId)

  if (!user) {
    return ctx.reply(
      "You don't have an active tracking window setup yet! Let's build one now.",
      Markup.keyboard([['🚀 Start Setup']]).resize(),
    )
  }

  const result = calculateProgress(user.start_date, user.end_date)
  const quote = getRandomQuote()

  await ctx.reply(
    `✨ *Your Current Progress* ✨\n\n` +
      `_"${quote}"_\n\n` +
      `📊 You have consumed *${result.percentage}%* of your timeline!`,
    { parse_mode: 'Markdown', ...mainDashboardKeyboard }, // Keep the persistent buttons available
  )
}

// Bind both the text button and the slash command to the status function
bot.command('status', handleStatusRequest)
bot.hears('📊 Check My Progress', handleStatusRequest)

// Handle direct setup button trigger
bot.hears(['🔄 Restart/Update My Timeline', '🚀 Start Setup'], async (ctx) => {
  const chatId = ctx.chat.id
  userStates[chatId] = { step: 'AWAITING_START_DATE' }
  await ctx.reply(
    "Let's reset your profile. Enter your new **Start Date** (`YYYY-MM-DD`):",
    { reply_markup: { remove_keyboard: true } },
  )
})

// 3. Main Message Handler (Processes input dates)
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id
  const text = ctx.message.text.trim()
  const state = userStates[chatId]

  if (!state) {
    // Fallback: If they click or say something outside the wizard, keep showing dashboard buttons
    return ctx.reply(
      'Use the buttons below to interact with me anytime!',
      mainDashboardKeyboard,
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

    const evaluation = calculateProgress(startDateStr, endDateStr)
    if (!evaluation.success) {
      return ctx.reply(
        `❌ Configuration Error: ${evaluation.error}. Let's start over. Send /start to retry.`,
      )
    }

    await ctx.reply(
      '⏳ Syncing your profile details securely to our servers...',
    )
    const saveResult = await saveUserDates(chatId, startDateStr, endDateStr)

    if (saveResult.success) {
      delete userStates[chatId] // Clear state

      await ctx.reply(
        '🎉 *Setup Complete!* \n\n' +
          'Your timeline metrics have been successfully saved. I will track your progress daily!\n\n' +
          'You can now use the dashboard buttons below to interact with me instantly.',
        { parse_mode: 'Markdown', ...mainDashboardKeyboard }, // Give them their everyday dashboard buttons immediately
      )
    } else {
      ctx.reply(
        '⚠️ Critical storage issue occurred while writing profile data. Please try again later.',
      )
    }
  }
})

bot
  .launch()
  .then(() => console.log('🚀 Upgraded Production UI Bot Engine Activated!'))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
