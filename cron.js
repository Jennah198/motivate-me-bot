const { createClient } = require('@supabase/supabase-js')
const { Telegraf } = require('telegraf')
const { calculateProgress, getRandomQuote } = require('./utils')
const express = require('express')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
)
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

/**
 * Core Execution Engine
 */
async function runDailyBroadcast() {
  console.log('⏰ Starting Daily Notification Engine broadcast loop...')
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('❌ Database error:', error.message)
    return false
  }
  if (!users || users.length === 0) {
    console.log('ℹ️ Zero active users found.')
    return true
  }

  for (const user of users) {
    const chatId = user.telegram_chat_id
    const metrics = calculateProgress(user.start_date, user.end_date)

    if (!metrics.success) continue

    if (metrics.status === 'completed') {
      await bot.telegram.sendMessage(
        chatId,
        '🏁 *Congratulations!* You have officially reached the end date of your milestone tracking window. Exceptional work!',
        { parse_mode: 'Markdown' },
      )
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('telegram_chat_id', chatId)
      continue
    }

    const motivationQuote = getRandomQuote()
    const dynamicMessage =
      `☀️ *Your Morning Fuel Call* ☀️\n\n` +
      `_"${motivationQuote}"_\n\n` +
      `🔥 You have used *${metrics.percentage}%* of your milestone timeline! Keep hitting it hard today!`

    try {
      await bot.telegram.sendMessage(chatId, dynamicMessage, {
        parse_mode: 'Markdown',
      })
    } catch (err) {
      console.error(`Failed sending to ${chatId}:`, err.message)
    }
  }
  return true
}

// 🌐 Expose a secure web endpoint
app.get('/trigger-broadcast', async (req, res) => {
  const secretToken = req.query.token

  // Security barrier: verification check
  if (!secretToken || secretToken !== process.env.CRON_SECRET_TOKEN) {
    console.warn('⚠️ Unauthorized access attempt to cron trigger endpoint!')
    return res.status(403).send('Forbidden: Invalid Token')
  }

  const success = await runDailyBroadcast()
  if (success) {
    res.status(200).send('Broadcast fired successfully!')
  } else {
    res.status(500).send('Internal engine failure during broadcast.')
  }
})

// Start listening on Render's assigned port
app.listen(PORT, () => {
  console.log(`📡 Cron Web Server listening on port ${PORT}`)
})
