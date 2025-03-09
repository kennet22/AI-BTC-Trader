import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition - A component that provides smooth transitions between pages
 * 
 * This component wraps page content with Framer Motion animations for smooth
 * enter and exit transitions. It should be used inside page components.
 */
const PageTransition = ({ children, variant = 'slide' }) => {
  // Different animation variants
  const variants = {
    // Slide in from the side
    slide: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 }
    },
    // Fade in and out
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    // Scale up from smaller size
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.1 }
    },
    // Slide up from bottom
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    }
  };

  // Choose the selected variant
  const selectedVariant = variants[variant] || variants.slide;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariant}
      transition={{
        type: 'tween', // Use a spring animation
        ease: 'easeInOut', // Easing function
        duration: 0.35 // Animation duration in seconds
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition; 