'use client';

import Providers from "./Providers";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <body className="antialiased">
      <Providers>{children}</Providers>
    </body>
  );
} 