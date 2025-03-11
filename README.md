# AlkaForge

AlkaForge is a content management system designed for content creators to easily generate and manage content (X posts, threads, replies, and Discord announcements) enhanced by AI (Anthropic's Claude-3.7-Sonnet via OpenRouter API).

## Features

- **User Authentication**: Secure login/signup via Supabase Auth
- **Knowledge Base**: Upload and manage PDFs, TXT, and Markdown files
- **AI-Enhanced Content Generation**: Generate high-quality content using Claude-3.7-Sonnet
- **Content Types**: X posts, threads, replies, and Discord announcements
- **Modern UI**: Dark mode with purple SaaS aesthetics using Tailwind CSS

## Tech Stack

- **Frontend & Backend**: Next.js and React
- **Authentication & Database**: Supabase (authentication, database, and storage)
- **AI Integration**: OpenRouter API with Claude-3.7-Sonnet
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js and npm installed
- Supabase account
- OpenRouter API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/alkaforge.git
   cd alkaforge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase and OpenRouter API credentials

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

Create the following tables in your Supabase project:

### profiles
- id (uuid, primary key, references auth.users.id)
- email (text)
- full_name (text)
- created_at (timestamp with time zone)

### projects
- id (uuid, primary key)
- name (text, not null)
- description (text)
- user_id (uuid, not null, references auth.users.id)
- created_at (timestamp with time zone, default: now())

### knowledge_files
- id (uuid, primary key)
- name (text, not null)
- file_type (text, not null)
- size (integer, not null)
- url (text, not null)
- storage_path (text, not null)
- project_id (uuid, not null, references projects.id)
- user_id (uuid, not null, references auth.users.id)
- created_at (timestamp with time zone, default: now())

### content_history
- id (uuid, primary key)
- prompt (text, not null)
- content (text, not null)
- content_type (text, not null)
- tone (text, not null)
- project_id (uuid, not null, references projects.id)
- user_id (uuid, not null, references auth.users.id)
- created_at (timestamp with time zone, default: now())

## Deployment

This application is configured for easy deployment on Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Set the environment variables
4. Deploy

## License

[MIT](LICENSE)

---

Created with ❤️ for content creators everywhere. 