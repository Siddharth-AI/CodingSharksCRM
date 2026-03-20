# CRM + WhatsApp Automation System

A comprehensive Customer Relationship Management system with automated WhatsApp messaging designed for coaching institutes. Built with Next.js 14, TypeScript, Redux Toolkit, and Supabase.

## Features

- **Lead Management**: Complete CRUD operations with Kanban pipeline visualization
- **Course Management**: Manage educational programs with category-based organization
- **WhatsApp Automation**: Automated welcome and follow-up messages via WhatsApp Business API
- **Activity Timeline**: Comprehensive tracking of all lead interactions
- **Analytics Dashboard**: Real-time statistics and conversion tracking
- **Message Templates**: Course-specific templates with variable substitution
- **Authentication**: Secure admin-only access with JWT tokens
- **Professional Architecture**: MVC pattern with TypeScript strict mode

## Technology Stack

### Frontend/Backend
- **Next.js 14** with App Router
- **TypeScript** (latest with strict configuration)
- **TailwindCSS** for styling
- **React 19** with modern hooks

### State Management
- **Redux Toolkit** for centralized state management
- **RTK Query** for API caching and data fetching
- **Redux Persist** for authentication state persistence

### Database & Authentication
- **Supabase** (PostgreSQL) for data persistence
- **NextAuth.js** with Supabase adapter
- **JWT** tokens for secure authentication

### Validation & HTTP
- **Joi** for comprehensive input validation
- **Axios** with interceptors for HTTP requests
- **bcryptjs** for password hashing

### Testing
- **Jest** with React Testing Library for unit tests
- **fast-check** for property-based testing
- **@testing-library/jest-dom** for DOM assertions

### Development Tools
- **ESLint** with Next.js configuration
- **TypeScript** strict mode with custom path mapping
- **@dnd-kit** for drag-and-drop functionality (Kanban board)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── providers.tsx      # Redux providers
├── components/            # Reusable UI components
├── controllers/           # API route controllers (MVC)
├── hooks/                # Custom React hooks
│   └── redux.ts          # Typed Redux hooks
├── lib/                  # Library configurations
│   ├── axios.ts          # Axios client setup
│   └── supabase.ts       # Supabase client
├── middleware/           # API middleware
│   ├── auth.ts           # Authentication middleware
│   └── errorHandler.ts   # Error handling middleware
├── models/               # Data models (MVC)
├── store/                # Redux store configuration
│   ├── api.ts            # RTK Query API slice
│   ├── index.ts          # Store configuration
│   └── slices/           # Redux slices
├── types/                # TypeScript type definitions
│   └── index.ts          # Core domain types
├── utils/                # Utility functions
│   ├── errorHandling.ts  # Error handling utilities
│   ├── formatters.ts     # Data formatting utilities
│   └── validation.ts     # Joi validation schemas
└── views/                # View components (MVC)
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# WhatsApp API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- WhatsApp Business API access

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd crm-whatsapp-system
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up database schema:**
   - Create Supabase project
   - Run database migrations (Task 2)
   - Configure authentication

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:ci` - Run tests for CI/CD
- `npm run type-check` - TypeScript type checking

## Architecture Highlights

### MVC Pattern
- **Models**: Data structures and database interactions
- **Views**: React components with TypeScript interfaces  
- **Controllers**: API route handlers with business logic separation

### Redux Architecture
- **Centralized State**: All application state managed through Redux store
- **RTK Query**: Automatic caching, background updates, and optimistic updates
- **Type Safety**: Fully typed actions, reducers, and selectors

### Error Handling
- **Global Error Boundaries**: React error boundaries for component errors
- **API Error Handling**: Comprehensive error handling with user-friendly messages
- **Validation**: Joi schemas for all user inputs with detailed error messages

### Testing Strategy
- **Unit Tests**: Component and function testing with Jest
- **Property-Based Tests**: Universal correctness validation with fast-check
- **Integration Tests**: API endpoint and database operation testing

## Development Guidelines

### Code Quality
- **TypeScript Strict Mode**: Enforced type safety throughout
- **ESLint Configuration**: Next.js recommended rules
- **Path Mapping**: Clean imports with @ aliases
- **Error Handling**: Comprehensive error boundaries and validation

### Performance
- **Code Splitting**: Automatic with Next.js App Router
- **Caching**: RTK Query for API response caching
- **Optimistic Updates**: Immediate UI updates with rollback on failure

### Security
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Joi validation on all inputs
- **SQL Injection Protection**: Supabase parameterized queries
- **CORS Configuration**: Proper cross-origin request handling

## Next Steps

This completes **Task 1: Project Setup and Configuration**. The foundation is now ready for:

1. **Task 2**: Database Schema and Supabase Setup
2. **Task 3**: Authentication System Implementation  
3. **Task 4**: Redux Store Architecture Setup
4. **Task 5**: API Layer with Axios Configuration

## Contributing

1. Follow the established MVC architecture
2. Maintain TypeScript strict mode compliance
3. Add comprehensive tests for new features
4. Update documentation for significant changes

## License

This project is proprietary software for coaching institute use.