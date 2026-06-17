const { createClient } = require('@supabase/supabase-js')
const { Telegraf } = require('telegraf')
const { calculateProgress, getRandomQuote } = require('./utils')
require('dotenv').config()

// Initialize both clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
)
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

/**
 * Core Execution Engine: Fetches active users, computes metrics, and broadcasts messages.
 */
async function runDailyBroadcast() {
  console.log('Starting Daily Notification Engine broadcast loop...')

  // 1. Fetch all active users from the cloud database
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active records from database:', error.message)
    return
  }

  if (!users || users.length === 0) {
    console.log(
      'Broadcast complete: Zero active user rows found in database queues.',
    )
    return
  }

  console.log(
    `Found ${users.length} active timelines to process. Distributing...`,
  )

  // 2. Iterate through users and dynamically send customized metrics
  for (const user of users) {
    const chatId = user.telegram_chat_id

    // Evaluate metrics using our existing utility function
    const metrics = calculateProgress(user.start_date, user.end_date)

    if (!metrics.success) {
      console.warn(
        ` Skipping User ${chatId} due to calculations error: ${metrics.error}`,
      )
      continue
    }

    // Check if their timeline has officially concluded today
    if (metrics.status === 'completed') {
      await bot.telegram.sendMessage(
        chatId,
        '*Congratulations!* You have officially reached the end date of your milestone tracking window. Exceptional work sticking through it!',
        { parse_mode: 'Markdown' },
      )

      // Flip their status in the database to false so we don't spam them tomorrow
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('telegram_chat_id', chatId)
      console.log(`User ${chatId} timeline completed. Marked inactive.`)
      continue
    }

    // Build the dynamic motivation packet text string
    const motivationQuote = getRandomQuote()
    const dynamicMessage =
      `☀️ *Your Morning Fuel Call* ☀️\n\n` +
      `_"${motivationQuote}"_\n\n` +
      `🔥 You have used *${metrics.percentage}%* of your milestone timeline! Keep hitting it hard today!`

    try {
      // Direct API transmission via chat ID
      await bot.telegram.sendMessage(chatId, dynamicMessage, {
        parse_mode: 'Markdown',
      })
      console.log(
        `Successfully dispatched morning broadcast to user ID: ${chatId}`,
      )
    } catch (sendError) {
      console.error(
        `Failed to send message to user ${chatId}:`,
        sendError.message,
      )
    }
  }

  console.log('All scheduled active broadcasts executed successfully.')
}

// Immediately invoke the function if this file is executed directly
runDailyBroadcast()
