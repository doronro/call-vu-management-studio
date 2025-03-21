# Call VU Management Studio

A conversational health intake system with multiple interaction modes (chat, voice, avatar).

## Features

- Process selection interface
- Multiple interaction modes (chat, voice, avatar)
- Form completion through conversational interface
- Analytics dashboard
- Process management

## Recent Fixes

- Fixed "Start Session" button navigation to use React Router instead of window.location, preventing page reloads

## Development

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

- `/src/components/` - Reusable UI components
  - `/src/components/ui/` - Base UI components
  - `/src/components/chat/` - Chat-related components
  - `/src/components/form/` - Form-related components
- `/src/pages/` - Application pages
- `/src/api/` - API clients and entity definitions
- `/src/utils/` - Utility functions
- `/src/hooks/` - Custom React hooks
- `/src/lib/` - Library code
