# SyncKit Website

Official documentation website for SyncKit - built with React, Vite, Tailwind CSS, and Shadcn UI.

## Features

- 🎨 Modern developer-focused design with JetBrains Mono font
- 📱 Fully responsive layout
- 📚 Comprehensive documentation
- 🔍 API reference with search
- 💻 Interactive playground
- 🎯 Real-world examples
- 🚀 Auto-deployed to GitHub Pages

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The website is automatically deployed to GitHub Pages at [synckit.oxog.dev](https://synckit.oxog.dev) whenever changes are pushed to the main branch.

### Manual Deployment

1. Build the website: `npm run build`
2. Deploy the `dist` folder to your hosting provider

### Custom Domain Configuration

The site is configured to use the custom domain `synckit.oxog.dev`. To set this up:

1. Add a CNAME record in your DNS settings pointing to `<username>.github.io`
2. The CNAME file in `public/CNAME` contains the custom domain
3. GitHub Pages will automatically handle the SSL certificate via Let's Encrypt

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── layout/       # Header, Footer
│   │   └── ui/           # Shadcn UI components
│   ├── pages/
│   │   ├── Home.tsx      # Landing page
│   │   ├── Docs.tsx      # Documentation
│   │   ├── API.tsx       # API reference
│   │   ├── Examples.tsx  # Examples showcase
│   │   └── Playground.tsx # Interactive playground
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/
│   └── CNAME             # Custom domain configuration
└── vite.config.ts        # Vite configuration
```

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Radix UI** - Headless components
- **Lucide React** - Icons
- **React Router** - Routing
- **JetBrains Mono** - Developer font

## License

MIT
