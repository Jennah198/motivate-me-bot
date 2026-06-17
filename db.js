const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env file!')
  process.exit(1)
}

// Initialize the Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Saves or updates a user's target milestone dates in the database.
 * @param {number} chatId - Unique Telegram chat ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
async function saveUserDates(chatId, startDate, endDate) {
  const { data, error } = await supabase.from('users').upsert(
    {
      telegram_chat_id: chatId,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    },
    { onConflict: 'telegram_chat_id' },
  ) // If user exists, overwrite their dates

  if (error) {
    console.error(`Database Error saving user ${chatId}:`, error.message)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

/**
 * Fetches a single user record by their chat ID.
 * @param {number} chatId
 */
async function getUser(chatId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (error) {
    console.error(`Database Error fetching user ${chatId}:`, error.message)
    return null
  }
  return data
}

module.exports = {
  saveUserDates,
  getUser,
}
