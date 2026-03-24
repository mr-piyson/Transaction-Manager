// lib/api.ts
'use client';

import axios from 'axios';

const api = axios.create({
  // Use an environment variable for the base URL.
  // In Next.js, "NEXT_PUBLIC_" prefix makes it available to the browser.
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
