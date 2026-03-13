// context/ApiContext.tsx
"use client";

import { createContext, useContext, useState, useMemo } from "react";
import { treaty } from "@elysiajs/eden";
import { API } from "@/api/server";

export const ApiContext = createContext<any>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("custom_api_url") || "http://localhost:3000";
    }
    return "http://localhost:3000";
  });

  const client = useMemo(() => treaty<API>(baseUrl), [baseUrl]);

  const updateServer = (newUrl: string) => {
    localStorage.setItem("custom_api_url", newUrl);
    setBaseUrl(newUrl);
    window.location.reload(); // Reloading ensures all hooks reset with the new client
  };

  return (
    <ApiContext.Provider value={{ client, updateServer, baseUrl }}>
      {children}
    </ApiContext.Provider>
  );
}
