# TypeBuddy

A fun and interactive typing speed tester that lets users measure their typing speed and accuracy in different modes.  
Perfect for practice, competition, or just to see how fast you really are.

---

## Features

- **Multiple Modes**
  - **Timed Test** — 30s, 60s, or custom duration
  - **Words Test** — Type a fixed number of words
  - **Custom Paragraph** — Test with your own text
- **Instant Results**
  - Words per minute (WPM)
  - Accuracy percentage
  - Number of correct and incorrect words
- **Live Feedback** — Mistakes highlighted as you type
- **Responsive Design** — Works on desktop, tablet, and mobile

---

## Tech Stack

**Frontend:** HTML, CSS (Tailwind), JavaScript  
**Backend (optional for leaderboard):** Python (Flask) or Node.js  
**Database (optional):** SQLite / MongoDB  

---

## How It Works

1. **Select Mode** — Choose between timed, words, or custom paragraph mode.
2. **Start Typing** — The timer or word counter starts as soon as you type the first character.
3. **Get Results** — WPM, accuracy, and errors are displayed instantly.
4. **(Optional) Leaderboard** — If backend is enabled, compare your score with other users.

---

## Installation

### Prerequisites
- Git
- A browser (latest Chrome/Firefox recommended)
- *(Optional)* Python 3.8+ or Node.js if using backend features

### Steps
```bash
# Clone the repository
git clone https://github.com/<your-username>/TypeBuddy.git
cd TypeBuddy

# If backend (Flask) is used:
pip install -r requirements.txt
flask run

# Or simply open index.html for frontend-only mode
