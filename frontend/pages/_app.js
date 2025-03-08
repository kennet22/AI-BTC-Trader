import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from 'react-query';
import '../styles/globals.css';
import dynamic from 'next/dynamic';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Dynamically import the Toaster component with { ssr: false } to prevent SSR issues
const Toaster = dynamic(
  () => import('react-hot-toast').then((mod) => mod.Toaster),
  { ssr: false }
);

function MyApp({ Component, pageProps }) {
  // Use state to track if we're on the client side
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true once the component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>Bitcoin AI Trader</title>
        <meta name="description" content="AI-powered Bitcoin trading platform" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Component {...pageProps} />
      {/* Only render Toaster on the client side */}
      {isClient && <Toaster position="bottom-right" />}
    </QueryClientProvider>
  );
}

export default MyApp; 