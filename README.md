# MotivateMe — Dynamic Milestone Progress Telegram Bot

MotivateMe is a public, multi-tenant Telegram utility bot built to help users stay accountable during major personal or academic timelines (e.g., summer vacations, semesters, or custom 90-day challenges). 

Users interact with an automated setup wizard to store their milestone windows. Every single morning, a decoupled notification engine pulls active records from a cloud database, calculates exactly how much of that specific timeline has been consumed, and delivers a randomized high-value motivational quote paired with their personalized progress percentage.

---

## 🚀 Live Demo
You can interact with the production bot live on Telegram here: **[t.me/Progress-Bot](https://t.me/@JennahMotivateBot)**

---

## 🛠️ Tech Stack & Architecture

This project was built using a decoupled, production-ready microservice architecture:

* **Application Environment:** Node.js running asynchronously to handle concurrent, event-driven network transactions.
* **Bot Framework:** `Telegraf` (Telegram Bot API wrapper) leveraging interactive Reply Keyboards and runtime profile menu configuration.
* **Database Management:** `Supabase` (PostgreSQL) hosting persistent storage to handle state and configuration metrics for multiple public users securely.
* **Web Framework:** `Express.js` exposing a secure, authenticated webhook endpoint to decouple the notification worker loop.
* **Cloud Hosting:** `Render` hosting the application instance 24/7.
* **Automation Schedulers:** `Cron-Job.org` serving as an external web-cron execution trigger.

---

## 📊 Core Calculation Logic

The fundamental progress engine avoids standard timestamp discrepancies by using calendar day deltas provided by `date-fns`:

$$\text{Percentage Consumed} = \left( \frac{\text{Current Date} - \text{Start Date}}{\text{End Date} - \text{Start Date}} \right) \times 100$$

* **Upcoming Status:** If the current date is chronologically before the configured start date, the metric returns `0%`.
* **Concluded Status:** If the current date matches or surpasses the targeted end date, the system auto-notifies the user of completion and flips their database queue flag (`is_active: false`) to gracefully conclude tracking.

---

## 💾 Database Schema

The system uses a highly optimized table structure inside Supabase to cleanly support public multi-user separation:

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `telegram_chat_id` | BigInt | Primary Key, Unique | Unique target delivery ID from Telegram API |
| `start_date` | Date | NOT NULL | Milestone launch threshold |
| `end_date` | Date | NOT NULL | Milestone target deadline |
| `is_active` | Boolean | Default: `true` | Operational visibility flag for the cron queue |
| `created_at` | Timestamp | Default: `NOW()` | Audit entry tracking |

---

## ⚙️ Local Development Setup

To replicate this environment on your machine:

### 1. Clone the repository
```bash
git clone [https://github.com/Jennah198/motivate-me-bot.git](https://github.com/Jennah198/motivate-me-bot.git)
cd motivate-me-bot
2. Install dependencies
npm install
3. Configure local environment variables
Create a .env file in the root directory and specify your secret API credentials:

Code snippet
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
SUPABASE_KEY=your_supabase_anon_public_key_here
CRON_SECRET_TOKEN=your_custom_secure_webhook_password_here
4. Run the components
To start the 24/7 conversational bot listener:

Bash
    node index.js
    ```
* **To test-fire a mock notification broadcast directly:**
```bash
    node cron.js
    ```

---

## 🛡️ Security Protocols
* **Protected Routes:** The automated daily broadcast webhook `/trigger-broadcast` utilizes a token-matching gatekeeper query (`CRON_SECRET_TOKEN`). Unauthorized web requests are rejected with an explicit HTTP `403 Forbidden` code.
* **Credentials Separation:** All secure database endpoints and cryptographic authentication variables are managed strictly via environment values on the production host instance and explicitly scrubbed from source control via `.gitignore`.

---

## 🤝 Acknowledgments
* Built as part of an incremental frontend/backend software development curriculum.
* Shoutout to Telegram's `@BotFather` for the instant infrastructural provisioning!
