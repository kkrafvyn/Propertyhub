# PropertyHub Development Guide

Welcome to the PropertyHub development environment! This guide will help you get started with developing and maintaining the PropertyHub real estate marketplace application.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18+ (recommended: v20+)
- **npm**: v9+ or **yarn**: v1.22+
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions (see [.vscode/extensions.json])

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd propertyhub

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### First-Time Setup

1. **Install VS Code Extensions**: VS Code will prompt you to install recommended extensions
2. **Configure Supabase**: Set up your Supabase project (optional for frontend development)
3. **Run the Application**: Open http://localhost:5173 in your browser

## 📁 Project Structure

```
propertyhub/
├── components/           # React components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   ├── auth/            # Authentication components
│   ├── chat/            # Chat system components
│   ├── mobile/          # Mobile-specific components
│   ├── analytics/       # Analytics dashboard components
│   └── ...
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and helpers
├── styles/              # Global styles (Tailwind CSS)
├── data/               # Mock data and constants
├── docs/               # Documentation
├── .vscode/            # VS Code configuration
└── public/             # Static assets
```

## 🛠️ Development Tools

### Code Quality

- **ESLint**: Linting with TypeScript support
- **Prettier**: Code formatting
- **TypeScript**: Type checking and IntelliSense
- **Husky**: Git hooks for quality checks

### UI Development

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality components
- **Lucide React**: Icon library
- **Motion**: Animation library (formerly Framer Motion)

### State Management

- **React Context**: Global state management
- **Custom Hooks**: Encapsulated logic
- **Supabase**: Backend integration

### Development Utilities

Access development tools via browser console:

```javascript
// Open browser console and type:
window.__PROPERTYHUB_DEV__.logger.info('Hello from PropertyHub!')

// Generate mock data
const mockUser = window.__PROPERTYHUB_DEV__.createMockUser()
const mockProperties = window.__PROPERTYHUB_DEV__.createMockProperties(10)

// View debug information
window.__PROPERTYHUB_DEV__.getDebugInfo()
```

## 🎯 Component Development

### Component Guidelines

1. **Use TypeScript**: All components should be strongly typed
2. **Follow Naming Conventions**: PascalCase for components, camelCase for functions
3. **Add JSDoc Comments**: Document component props and behavior
4. **Implement Error Boundaries**: Wrap components in error boundaries
5. **Use Custom Hooks**: Extract logic into reusable hooks

### Example Component Structure

```tsx
/**
 * PropertyCard Component
 * 
 * Displays a property listing card with image, details, and actions.
 * 
 * @param property - The property data to display
 * @param onSelect - Callback when property is selected
 * @param className - Additional CSS classes
 */
interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  className
}) => {
  // Component logic here
  return (
    <div className={cn("property-card", className)}>
      {/* Component JSX */}
    </div>
  );
};
```

### UI Component Usage

```tsx
// Import UI components from the ui directory
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';

// Use in your components
<Card>
  <CardHeader>
    <CardTitle>Property Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Badge variant="secondary">Available</Badge>
    <Button onClick={handleClick}>View Details</Button>
  </CardContent>
</Card>
```

## 🎨 Styling Guide

### Tailwind CSS

PropertyHub uses Tailwind CSS v4 with custom design tokens defined in `styles/globals.css`.

**Important**: Do not use font size (`text-xl`), font weight (`font-bold`), or line height (`leading-none`) classes unless specifically requested, as these have default values set in the global CSS.

### Theme System

The application supports multiple themes:
- Light (default)
- Dark
- Blue, Green, Purple, Orange variants

```tsx
// Access theme in components
import { useTheme } from './components/ThemeProvider';

const { theme, setTheme } = useTheme();
```

### Custom CSS Classes

```css
/* Available utility classes */
.glass              /* Glass morphism effect */
.glass-dark         /* Dark glass effect */
.gradient-text      /* Gradient text effect */
.animate-float      /* Floating animation */
.animate-pulse3d    /* 3D pulse animation */
.custom-scroll      /* Custom scrollbar */
.shimmer           /* Loading shimmer effect */
```

## 🔌 API Integration

### Supabase Integration

```tsx
import { supabase } from './utils/supabase';

// Example API call
const fetchProperties = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'available');
    
  if (error) throw error;
  return data;
};
```

### Custom Hooks for Data

```tsx
// Use custom hooks for data fetching
import { useProperties } from './hooks/useProperties';
import { useAuth } from './hooks/useAuth';

const MyComponent = () => {
  const { properties, loading, error } = useProperties();
  const { user } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <PropertyList properties={properties} />;
};
```

## 📱 Mobile Development

### Responsive Design

All components should be mobile-first:

```tsx
// Use mobile-specific components when needed
import { MobileNavigation } from './components/mobile/MobileNavigation';
import { useMobile } from './hooks/useMobile';

const App = () => {
  const isMobile = useMobile();
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
};
```

### Mobile-Specific CSS

```css
/* Available mobile utilities */
.mobile-viewport        /* Full viewport height */
.mobile-safe-spacing    /* Safe area spacing */
.safe-area-pb          /* Safe area padding bottom */
.touch-target          /* Touch-friendly sizing */
.mobile-headline       /* Responsive typography */
```

## 🧪 Testing

### Component Testing

```tsx
// Example test structure
import { render, screen } from '@testing-library/react';
import { PropertyCard } from './PropertyCard';
import { createMockProperty } from '../utils/devUtils';

describe('PropertyCard', () => {
  it('renders property information', () => {
    const mockProperty = createMockProperty();
    render(<PropertyCard property={mockProperty} onSelect={jest.fn()} />);
    
    expect(screen.getByText(mockProperty.title)).toBeInTheDocument();
  });
});
```

### Testing Utilities

```tsx
import { 
  createMockUser, 
  createMockProperty, 
  createMockProperties 
} from './utils/devUtils';

// Generate test data
const testUser = createMockUser({ role: 'admin' });
const testProperties = createMockProperties(5);
```

## 🚀 Performance

### Optimization Tips

1. **Use React.memo**: For components that don't need frequent re-renders
2. **Implement useMemo/useCallback**: For expensive calculations
3. **Code Splitting**: Use lazy loading for large components
4. **Image Optimization**: Use appropriate image formats and sizes
5. **Bundle Analysis**: Monitor bundle size regularly

### Performance Monitoring

```tsx
// Use performance monitoring utilities
import { usePerformanceMonitor } from './utils/devUtils';

const MyComponent = () => {
  usePerformanceMonitor('MyComponent');
  // Component logic
};
```

## 🐛 Debugging

### Development Tools

1. **React DevTools**: Browser extension for React debugging
2. **Console Logging**: Use the enhanced logger from `utils/devUtils`
3. **Network Tab**: Monitor API calls and responses
4. **Performance Tab**: Analyze rendering performance

### Debugging Utilities

```tsx
import { logger, useWhyDidYouUpdate } from './utils/devUtils';

const MyComponent = (props) => {
  // Debug re-renders
  useWhyDidYouUpdate('MyComponent', props);
  
  // Enhanced logging
  logger.debug('Component rendered', { 
    component: 'MyComponent',
    data: props 
  });
};
```

## 📋 Common Tasks

### Adding a New Component

1. Create component file in appropriate directory
2. Add TypeScript interface for props
3. Implement component with proper typing
4. Add JSDoc documentation
5. Export from index file if needed
6. Add to Storybook (if applicable)

### Adding a New Page/Route

1. Create page component in `components/`
2. Add route to App.tsx navigation logic
3. Update AppState type in `types/index.ts`
4. Add mobile navigation item if needed
5. Update navigation handlers

### Adding New API Integration

1. Define types in `types/index.ts`
2. Create service function in `utils/`
3. Create custom hook in `hooks/`
4. Add error handling and loading states
5. Implement in components

## 🔧 Configuration

### Environment Variables

```bash
# Required for development
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional for enhanced features
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### VS Code Configuration

The project includes comprehensive VS Code settings:
- Auto-formatting on save
- TypeScript path resolution
- Tailwind CSS IntelliSense
- ESLint integration
- File nesting configuration

## 🚀 Deployment

### Build Process

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Deployment Platforms

The application is configured for:
- **Vercel**: Zero-config deployment
- **Netlify**: With netlify.toml configuration
- **Custom**: With build scripts

## 📚 Learning Resources

### Recommended Reading

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)

### Community

- Follow React and TypeScript best practices
- Use ESLint and Prettier for code consistency
- Write meaningful commit messages
- Document complex logic and components

## 🆘 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

**TypeScript Errors**
```bash
# Restart TypeScript server in VS Code
Ctrl+Shift+P -> "TypeScript: Restart TS Server"

# Check TypeScript configuration
npm run type-check
```

**Styling Issues**
```bash
# Rebuild Tailwind
npm run build-css

# Check for class conflicts
# Use Tailwind CSS IntelliSense extension
```

### Getting Help

1. Check this documentation first
2. Search existing issues in the repository
3. Ask in team chat/Slack
4. Create detailed issue with reproduction steps

## 🎉 Contributing

### Code Standards

- Follow TypeScript strict mode
- Use functional components with hooks  
- Implement proper error handling
- Write self-documenting code
- Add comments for complex logic

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make commits with descriptive messages
git commit -m "feat: add property search functionality"

# Push and create pull request
git push origin feature/new-feature
```

### Pull Request Guidelines

- Describe changes clearly
- Include screenshots for UI changes
- Ensure all tests pass
- Request appropriate reviewers
- Update documentation if needed

---

Happy coding! 🚀

For questions or suggestions about this development guide, please reach out to the development team.