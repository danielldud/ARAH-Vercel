'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {ThemeProvider, useTheme} from 'next-themes';
import {Sun, Moon, Monitor} from 'lucide-react';

export function AppearanceProvider({children}: {children: ReactNode}) {
  return <ThemeProvider attribute="class" storageKey="arah-appearance" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</ThemeProvider>;
}

export function AppearanceControl() {
  const {theme, setTheme} = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const value = mounted ? theme || 'system' : 'system';
  const Icon = value === 'dark' ? Moon : value === 'light' ? Sun : Monitor;
  return <label className="appearance-control"><Icon size={16} aria-hidden="true"/><span className="sr-only">Tema tampilan</span><select aria-label="Tema tampilan" value={value} disabled={!mounted} onChange={event => setTheme(event.target.value)}><option value="light">Terang</option><option value="dark">Gelap</option><option value="system">Ikuti perangkat</option></select></label>;
}
