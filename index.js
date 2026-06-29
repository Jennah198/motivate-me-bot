const { Telegraf, Markup } = require('telegraf')
const { saveUserDates, getUser } = require('./db')
const { calculateProgress, getRandomQuote } = require('./utils')
require('./cron') // Ensures the Express server runs simultaneously
require('dotenv').config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

const userStates = {}
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// 📊 Persistent Custom Keyboard Buttons for everyday use
const mainDashboardKeyboard = Markup.keyboard([
  ['📊 Check My Progress'],
  ['🔄 Restart/Update My Timeline'],
]).resize()

/**
 * Automatically configure Bot Profile UI descriptions & command menus on boot
 */
async function initializeBotSettings() {
  try {
    await bot.telegram.setMyDescription(
      'Welcome to MotivateMe! ☀️\n\n' +
        'This bot tracks your custom milestones (like summer, semesters, or personal challenges) ' +
        "and sends you daily motivational fuel along with the exact percentage of time you've consumed so far.",
    )
    await bot.telegram.setMyCommands([
      {
        command: 'start',
        description: 'Initialize or update your target tracking timeline',
      },
      {
        command: 'status',
        description: 'Instantly view your current milestone completion status',
      },
    ])
    console.log(
      '🤖 Bot profile interface and commands synchronized successfully.',
    )
  } catch (err) {
    console.error(
      '⚠️ Failed to initialize bot application profile:',
      err.message,
    )
  }
}

// 1. Handshake Command (/start)
bot.start(async (ctx) => {
  const chatId = ctx.chat.id
  userStates[chatId] = { step: 'AWAITING_START_DATE' }

  // Temporarily clear keyboard layout to prevent distraction during setup input sequence
  await ctx.reply(
    '👋 *Welcome to MotivateMe\\!*\n\n' +
      "Let's configure your tracking window\\. " +
      'Please reply by entering your *Start Date* in this exact format:\n\n' +
      '`YYYY\\-MM\\-DD` \\(e\\.g\\., 2026\\-06\\-14\\)',
    { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } },
  )
})

// 2. Core Status Check Logic
async function handleStatusRequest(ctx) {
  const chatId = ctx.chat.id

  try {
    const user = await getUser(chatId)

    if (!user) {
      return await ctx.reply(
        "You don't have an active tracking window setup yet! Let's build one now.",
        Markup.keyboard([['🚀 Start Setup']]).resize(),
      )
    }

    const result = calculateProgress(user.start_date, user.end_date)
    const quote = getRandomQuote()

    // Escape dynamic markdown input safely to comply with Telegram MarkdownV2 requirements
    const safeQuote = quote.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&')
    const safePercentage = String(result.percentage).replace(/[-.]/g, '\\$&')

    await ctx.reply(
      `✨ *Your Current Progress* ✨\n\n` +
        `_"${safeQuote}"_\n\n` +
        `📊 You have consumed *${safePercentage}%* of your timeline\\!`,
      { parse_mode: 'MarkdownV2', ...mainDashboardKeyboard },
    )
  } catch (error) {
    console.error('Status processing runtime failure:', error)
    await ctx.reply(
      '⚠️ An error occurred while retrieving your analytics status.',
    )
  }
}

// Bind both text buttons and slash commands
bot.command('status', handleStatusRequest)
bot.hears('📊 Check My Progress', handleStatusRequest)

// Handle layout reset and profile updates
bot.hears(['🔄 Restart/Update My Timeline', '🚀 Start Setup'], async (ctx) => {
  const chatId = ctx.chat.id
  userStates[chatId] = { step: 'AWAITING_START_DATE' }
  await ctx.reply(
    "Let's reset your profile. Enter your new *Start Date* (`YYYY-MM-DD`):",
    { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } },
  )
})

// 3. Structured Message Handler (Process sequential inputs)
bot.on('text', async (ctx, next) => {
  const chatId = ctx.chat.id
  const text = ctx.message.text.trim()
  const state = userStates[chatId]

  // Fallback: If no current state mapping exists, delegate or retain default dashboard buttons
  if (!state) {
    return await ctx.reply(
      'Use the buttons below to interact with me anytime!',
      mainDashboardKeyboard,
    )
  }

  // STEP A: Handling Start Date Input
  if (state.step === 'AWAITING_START_DATE') {
    if (!DATE_REGEX.test(text)) {
      return await ctx.reply(
        '❌ Invalid format. Please supply your start date precisely as `YYYY-MM-DD` (e.g., 2026-06-14)',
      )
    }

    state.startDate = text
    state.step = 'AWAITING_END_DATE'
    return await ctx.reply(
      '✅ Start Date recorded! Now, enter your **End Date** in the same `YYYY-MM-DD` format:',
    )
  }

  // STEP B: Handling End Date Input
  if (state.step === 'AWAITING_END_DATE') {
    if (!DATE_REGEX.test(text)) {
      return await ctx.reply(
        '❌ Invalid format. Please supply your end date precisely as `YYYY-MM-DD` (e.g., 2026-09-14)',
      )
    }

    const startDateStr = state.startDate
    const endDateStr = text

    const evaluation = calculateProgress(startDateStr, endDateStr)
    if (!evaluation.success) {
      delete userStates[chatId] // Purge broken state engine progress parameters
      return await ctx.reply(
        `❌ Configuration Error: ${evaluation.error}. Let's start over. Send /start to retry.`,
      )
    }

    await ctx.reply(
      '⏳ Syncing your profile details securely to our servers...',
    )

    try {
      const saveResult = await saveUserDates(chatId, startDateStr, endDateStr)

      if (saveResult.success) {
        delete userStates[chatId] // Safely wipe state memory map

        await ctx.reply(
          '🎉 *Setup Complete\\!* \n\n' +
            'Your timeline metrics have been successfully saved\\. I will track your progress daily\\!\n\n' +
            'You can now use the dashboard buttons below to interact with me instantly\\.',
          { parse_mode: 'MarkdownV2', ...mainDashboardKeyboard },
        )
      } else {
        throw new Error('Database write operation rejected')
      }
    } catch (dbError) {
      console.error('Critical database execution pipeline failure:', dbError)
      delete userStates[chatId]
      await ctx.reply(
        '⚠️ Critical storage issue occurred while writing profile data. Please execute /start to try again.',
        mainDashboardKeyboard,
      )
    }
  }
})

// Run App Instance Runtime Launch Wrapper
bot
  .launch()
  .then(() => {
    console.log('🚀 Upgraded Production UI Bot Engine Activated!')
    return initializeBotSettings()
  })
  .catch((launchError) => {
    console.error(
      '🔥 Fatal error experienced during Core engine activation sequence:',
      launchError,
    )
  })

// Clean up runtime memory bindings gracefully upon system shutdown sequences
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
