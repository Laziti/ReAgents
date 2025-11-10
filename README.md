# ReAgents - Real Estate Agent Platform

A modern, full-featured real estate agent platform built with React, TypeScript, and Supabase. Agents can create and manage property listings, while visitors can browse and search for properties.

## 🚀 Features

### For Agents
- **Dashboard**: View statistics and manage listings
- **Listing Management**: Create, edit, and manage property listings
- **Image Upload**: Upload and manage property images with R2 storage
- **Account Management**: Update profile and account information
- **Subscription Plans**: Free, Basic, Pro, and 6-month packages
- **Listing Limits**: Based on subscription tier
- **Expiration Management**: Listings expire after 2 months

### For Visitors
- **Property Search**: Search and browse property listings
- **Agent Profiles**: View agent public profiles
- **Listing Details**: View detailed property information
- **Category Filtering**: Filter by location, category, and status
- **Responsive Design**: Works on desktop, tablet, and mobile

### For Admins
- **User Management**: Manage users and their subscriptions
- **Payment Approval**: Approve subscription payments
- **Listing Management**: Manage all listings
- **Dashboard**: View platform statistics

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Storage**: Cloudflare R2 (via Supabase Edge Functions)
- **State Management**: React Query, React Context
- **Routing**: React Router DOM
- **Validation**: Zod
- **Date Handling**: date-fns

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Cloudflare R2 account (for image storage)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ReAgents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   npm run setup-env
   ```
   Or manually create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   See [ENV-SETUP.md](./ENV-SETUP.md) for detailed instructions.

4. **Configure R2 Storage**
   - Set up R2 bucket and credentials
   - Configure Supabase Edge Functions with R2 secrets
   - See [R2-SETUP.md](./R2-SETUP.md) for detailed instructions

5. **Run database migrations**
   ```bash
   # Apply migrations via Supabase dashboard or CLI
   # See supabase/migrations/ for migration files
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
ReAgents/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin components
│   │   ├── agent/          # Agent portal components
│   │   ├── public/         # Public-facing components
│   │   └── ui/             # UI components (shadcn/ui)
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Third-party integrations
│   │   └── supabase/       # Supabase client and types
│   ├── lib/                # Utility functions
│   │   ├── formatters.ts   # Data formatting utilities
│   │   ├── logger.ts       # Production-safe logging
│   │   ├── pagination.ts   # Pagination utilities
│   │   ├── sanitize.ts     # Input sanitization
│   │   ├── upload.ts       # File upload utilities
│   │   ├── utils.ts        # General utilities
│   │   └── validation.ts   # Validation schemas and rate limiting
│   ├── pages/              # Page components
│   ├── styles/             # Global styles
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── functions/          # Supabase Edge Functions
│   │   ├── create-user/    # User creation function
│   │   └── upload-to-r2/   # R2 upload function
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── README.md              # This file
```

## 🔐 Security

The application includes comprehensive security measures:

- **Input Sanitization**: All user inputs are sanitized to prevent XSS and SQL injection
- **Rate Limiting**: API calls are rate-limited to prevent abuse
- **Production-Safe Logging**: No sensitive data in console logs
- **Error Boundaries**: Graceful error handling
- **Authentication**: Supabase Auth with role-based access control
- **Database Security**: Row Level Security (RLS) policies

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed security information.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- Render
- AWS Amplify

Make sure to set the following environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📊 Subscription Plans

- **Free**: 10 listings
- **Basic**: 30 listings/month - 300 ETB/month
- **Pro**: 50 listings/month - 500 ETB/month
- **6-Month**: 50 listings/month - 2,500 ETB/6 months

Listings expire 2 months after creation.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run setup-env` - Set up environment variables

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting (if configured)

## 📝 Documentation

- [ENV-SETUP.md](./ENV-SETUP.md) - Environment variables setup
- [R2-SETUP.md](./R2-SETUP.md) - R2 storage configuration
- [R2-CORS-SETUP.md](./R2-CORS-SETUP.md) - R2 CORS configuration
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Security audit and fixes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For issues and questions:
1. Check the documentation files
2. Review the security audit for common issues
3. Contact the development team

## 🎯 Roadmap

- [ ] Code splitting for better performance
- [ ] Advanced search filters
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] Multi-language support

---

Built with ❤️ using React, TypeScript, and Supabase
