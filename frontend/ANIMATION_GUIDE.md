# UI Animation Implementation Guide

This guide explains how to implement and extend the animations throughout the Bitcoin Trading Application.

## Table of Contents

1. [Setup](#setup)
2. [Animated Stats Cards](#animated-stats-cards)
3. [Chart Animations](#chart-animations)
4. [Page Transitions](#page-transitions)
5. [Micro-interactions](#micro-interactions)
6. [Performance Considerations](#performance-considerations)

## Setup

The project uses [Framer Motion](https://www.framer.com/motion/) for animations. It's already installed in the project.

### Basic Usage

```jsx
import { motion } from 'framer-motion';

// Simple animation example
function AnimatedComponent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      I will fade in and move up!
    </motion.div>
  );
}
```

## Animated Stats Cards

### Usage

Replace existing stats cards with the new `AnimatedStatsCard` component:

```jsx
import AnimatedStatsCard from '../components/AnimatedStatsCard';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

// In your component
<AnimatedStatsCard 
  title="Bitcoin Price"
  value={formatPrice(btcPrice)}
  change={`${priceChangePercent > 0 ? '+' : ''}${formatPercentage(priceChangePercent)}`}
  trend={priceChangePercent > 0 ? 'up' : priceChangePercent < 0 ? 'down' : 'neutral'}
  icon={ArrowTrendingUpIcon}
  hasUpdated={valueHasJustChanged}
/>
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Card title |
| `value` | string/number | Main value to display |
| `change` | string | Change text (e.g., "+2.5%") |
| `trend` | string | 'up', 'down', or 'neutral' |
| `icon` | Component | Heroicon component |
| `hasUpdated` | boolean | Set to true to trigger pulse animation |

### Implementation in Dashboard

To replace all cards in the dashboard:

1. Import `AnimatedStatsCard` in `frontend/pages/index.js`
2. Replace each `StatsCard` with `AnimatedStatsCard`
3. Add state tracking for updates:

```jsx
// In your Dashboard component
const [updatedCards, setUpdatedCards] = useState({
  price: false,
  portfolio: false,
  position: false,
  winRate: false
});

// When data updates
useEffect(() => {
  if (newDataReceived) {
    setUpdatedCards(prev => ({ ...prev, price: true }));
    
    // Reset after animation completes
    setTimeout(() => {
      setUpdatedCards(prev => ({ ...prev, price: false }));
    }, 1000);
  }
}, [newDataReceived]);
```

## Chart Animations

To add animations to the existing charts:

### For Bitcoin Price Chart

1. Add Framer Motion to the chart container:

```jsx
// In BitcoinPriceChart.jsx
return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="chart-container"
  >
    <Line data={chartData} options={chartOptions} />
  </motion.div>
);
```

2. Animate data updates with Chart.js animations:

```jsx
const chartOptions = {
  // ...existing options
  animation: {
    duration: 1000,
    easing: 'easeOutQuart'
  },
  transitions: {
    active: {
      animation: {
        duration: 400
      }
    }
  }
};
```

## Page Transitions

To add smooth transitions between pages:

1. Create a `PageTransition` component:

```jsx
// components/PageTransition.jsx
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    x: -20
  },
  in: {
    opacity: 1,
    x: 0
  },
  out: {
    opacity: 0,
    x: 20
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3
};

const PageTransition = ({ children }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

export default PageTransition;
```

2. Use it in your pages:

```jsx
// In each page
import PageTransition from '../components/PageTransition';

export default function SomePage() {
  return (
    <Layout>
      <PageTransition>
        <div className="content">
          {/* Page content */}
        </div>
      </PageTransition>
    </Layout>
  );
}
```

3. Update `_app.js` to support exit animations:

```jsx
import { AnimatePresence } from 'framer-motion';

function MyApp({ Component, pageProps, router }) {
  return (
    <AnimatePresence mode="wait">
      <Component {...pageProps} key={router.route} />
    </AnimatePresence>
  );
}
```

## Micro-interactions

Add subtle animations to interactive elements:

### Animated Buttons

```jsx
// components/AnimatedButton.jsx
import { motion } from 'framer-motion';

const AnimatedButton = ({ children, ...props }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.1 }}
    {...props}
  >
    {children}
  </motion.button>
);
```

### Animated Form Inputs

```jsx
// components/AnimatedInput.jsx
import { motion } from 'framer-motion';

const AnimatedInput = ({ label, ...props }) => (
  <div className="input-group">
    <label>{label}</label>
    <motion.input
      initial={{ borderColor: '#e5e7eb' }}
      whileFocus={{ 
        borderColor: '#6366f1',
        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.2)'
      }}
      transition={{ duration: 0.2 }}
      {...props}
    />
  </div>
);
```

## Performance Considerations

To ensure animations run smoothly:

1. **Use Hardware Acceleration**

```css
.animated-element {
  will-change: transform;
  transform: translateZ(0);
}
```

2. **Reduce Animation Complexity in Mobile**

```jsx
// Use the useReducedMotion hook
import { useReducedMotion } from 'framer-motion';

function MyComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  const animationSettings = shouldReduceMotion 
    ? { x: 0 } // Simplified animation
    : { x: 100, y: 100, rotate: 45 }; // Full animation
    
  return (
    <motion.div animate={animationSettings}>
      Content
    </motion.div>
  );
}
```

3. **Lazy Load Animation Components**

```jsx
import dynamic from 'next/dynamic';

const AnimatedChart = dynamic(() => import('../components/AnimatedChart'), {
  ssr: false,
  loading: () => <div className="loading-placeholder">Loading...</div>
});
```

## Next Steps

After implementing these animations, you can:

1. Create custom branding animations for the logo
2. Add motion to the trading form interactions
3. Develop animated loaders for async operations
4. Build visualizations for AI analysis processes

## Example Showcase

Check out the UI animation showcase at `/ui-showcase` to see examples of these animations in action.

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Chart.js Animation Documentation](https://www.chartjs.org/docs/latest/configuration/animations.html)
- [Animation Performance Tips](https://web.dev/animations-guide/) 