# Using `NEXT_PUBLIC_API_URL`

This document explains how to connect a **Next.js frontend** to a **NestJS backend** using environment variables.

---

## What It Is

`NEXT_PUBLIC_API_URL` is the **public base URL** of your backend API. The browser must know this URL to send requests.

This exposes the **API address only**, not your secrets or database.

---

## Setup

Create `.env.local` in your Next.js project:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Restart the dev server after changing env files.

---

## Axios Example

```js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Security Notes

* API URLs are public by design
* Protect routes using JWT guards in NestJS
* Never put secrets in `NEXT_PUBLIC_*`

---

## Optional

If frontend and backend share a domain, you can use:

```
NEXT_PUBLIC_API_URL=/api
```

and route requests via a proxy.

---

## Summary

* `NEXT_PUBLIC_API_URL` tells the browser where the backend is
* This is safe and expected
* Security lives in backend authentication, not hidden URLs
