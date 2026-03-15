# CaloriesCount - Smart Calorie & Fitness Tracker

A modern, AI-powered nutrition and fitness tracking application built with Next.js, Supabase, and Groq AI.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Features

### Core Functionality
- **Food Logging** - Search and log meals with nutritional data from Open Food Facts
- **AI Food Scanner** - Take a photo of food and AI estimates calories and nutrition
- **Calorie Tracking** - Track daily calories, protein, carbs, and fat intake
- **Water Tracking** - Monitor daily water consumption
- **Weight Progress** - Log and visualize weight changes over time

### AI Features
- **AI Nutrition Coach** - Chat with an AI assistant for personalized nutrition advice
- **AI Meal Plans** - Generate customized meal plans based on your goals
- **AI Exercise Plans** - Get personalized workout routines
- **Exercise Animations** - Visual demonstrations for exercises

### Additional Features
- **Dark Mode** - Toggle between light, dark, and system themes
- **Smart Notifications** - Calorie and water intake reminders
- **User Onboarding** - Personalized setup with goals and body metrics
- **Progress Dashboard** - Visual overview of daily and weekly progress
- **Streak Tracking** - Gamify your fitness journey
- **Responsive Design** - Works on mobile and desktop
- **PWA Support** - Install as a native app

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Supabase (Auth, Database)
- **AI**: Groq API (text), xAI Grok (vision)
- **Data**: Open Food Facts API
- **State**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Groq or xAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/nashin2025/Caloriescount.git
cd Caloriescount

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
XAI_API_KEY=your_xai_api_key
```

**API Key Setup:**
- **Groq API** (for text AI): Get from https://console.groq.com
- **xAI API** (for food image recognition): Get from https://console.x.ai

### Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL migrations in `supabase/schema.sql`
3. Configure RLS policies as needed

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/           # Auth pages (login, signup, onboarding)
│   ├── (main)/           # Protected pages
│   │   ├── dashboard/   # Main dashboard
│   │   ├── log/         # Food logging with AI scanning
│   │   ├── exercise/    # Exercise tracking
│   │   ├── progress/    # Progress charts
│   │   ├── coach/       # AI chat
│   │   └── settings/    # User settings & dark mode
│   └── api/             # API routes (AI, food search)
├── components/           # React components
├── lib/                  # Utilities and clients
├── store/               # Zustand state management
└── types/               # TypeScript types
```

## License

MIT License - feel free to use this project for learning or commercial purposes.
