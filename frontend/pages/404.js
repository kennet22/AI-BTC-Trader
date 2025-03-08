import React from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';

export default function Custom404() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-16">
        <h1 className="mb-4 text-4xl font-bold text-primary-600">404</h1>
        <h2 className="mb-8 text-2xl font-medium text-gray-700">Page Not Found</h2>
        <p className="max-w-md mb-8 text-center text-gray-500">
          Sorry, we couldn't find the page you were looking for. It might have been moved or doesn't exist.
        </p>
        <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          Return to Dashboard
        </Link>
      </div>
    </Layout>
  );
} 