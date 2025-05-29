# Grocery List AI

A modern web application that helps users manage their grocery lists with AI-powered features. Built with Next.js, TypeScript, and Supabase.

## Features

- 🔐 Authentication with Supabase Auth
- 🛒 Create and manage grocery lists
- 🤖 AI-powered recipe suggestions and meal planning
- 📱 Responsive design with Tailwind CSS
- 🔄 Real-time updates
- 🎯 TypeScript for type safety

## Tech Stack

- **Frontend Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: 
  - OpenAI API
  - Google Generative AI
- **UI Components**: 
  - Headless UI
  - Heroicons
  - Geist Font

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- Supabase account
- OpenAI API key
- Google AI API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Next Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd grocery-list-ai
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client:
```bash
npm run postinstall
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```
grocery-list-ai/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── __tests__/        # Test files
│   └── types/            # TypeScript type definitions
├── prisma/                # Prisma schema and migrations
├── public/               # Static assets
└── types/                # Global type definitions
```

## Testing

The project uses Jest and React Testing Library for testing. Run tests with:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
