const { differenceInDays, parseISO, isValid } = require('date-fns')

/**
 * Calculates the percentage of time consumed between two dates.
 * @param {string} startStr - Start date in YYYY-MM-DD format
 * @param {string} endStr - End date in YYYY-MM-DD format
 * @returns {object} An object containing the percentage integer and a status flag
 */
function calculateProgress(startStr, endStr) {
  // 1. Parse strings into actual Date objects
  const startDate = parseISO(startStr)
  const endDate = parseISO(endStr)
  const currentDate = new Date() // Today's date

  // 2. Validation: Ensure the dates are structurally valid
  if (!isValid(startDate) || !isValid(endDate)) {
    return {
      success: false,
      percentage: 0,
      error: 'Invalid date formats provided.',
    }
  }

  // 3. Validation: Ensure the timeline makes chronological sense
  if (differenceInDays(endDate, startDate) <= 0) {
    return {
      success: false,
      percentage: 0,
      error: 'End date must be after start date.',
    }
  }

  // 4. Edge Case: If today hasn't reached the start date yet
  if (differenceInDays(startDate, currentDate) > 0) {
    return { success: true, percentage: 0, status: 'upcoming' }
  }

  // 5. Edge Case: If today has surpassed the deadline
  if (differenceInDays(currentDate, endDate) > 0) {
    return { success: true, percentage: 100, status: 'completed' }
  }

  // 6. Core Math Formula
  const totalDays = differenceInDays(endDate, startDate)
  const daysPassed = differenceInDays(currentDate, startDate)

  // Calculate percentage and round it to the nearest whole number
  const percentage = Math.round((daysPassed / totalDays) * 100)

  return { success: true, percentage: percentage, status: 'active' }
}

// Export the function so index.js can use it later
module.exports = { calculateProgress }

const MOTIVATIONAL_QUOTES = [
  "Don't stop when you're tired. Stop when you're done.",
  'Every strike brings me closer to the next home run.',
  "Hard work beats talent when talent doesn't work hard.",
  'The only way to do great work is to love what you do.',
  'Precision beats power, and timing beats speed.',
  'Remember why you started. Push harder today!',
  'Small daily improvements over time lead to stunning results.',
  'Your future self is counting on you to outwork your doubts today.',
]

/**
 * Grabs a random string from our collection of quotes.
 * @returns {string} A motivational quote
 */
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  return MOTIVATIONAL_QUOTES[randomIndex]
}

// Update our exports to include the new function
module.exports = {
  calculateProgress,
  getRandomQuote,
}

// --- TEMPORARY TEST EXECUTION ---
// We will simulate a milestone where summer started on June 1st and ends on Sept 1st
const testStart = '2026-06-01'
const testEnd = '2026-09-01'

const progressResult = calculateProgress(testStart, testEnd)
const quote = getRandomQuote()

console.log('=== UTILITIES INFRASTRUCTURE TEST ===')
console.log(`Motivational Quote: "${quote}"`)
console.log(`Timeline Status: ${progressResult.status.toUpperCase()}`)
console.log(`Percentage Consumed: ${progressResult.percentage}%`)
console.log('=====================================')
