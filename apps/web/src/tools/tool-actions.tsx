'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { createPortal } from 'react-dom';

const FooterContext = createContext<HTMLElement | undefined>(undefined);

/** Provides the footer of the tool's dialog to `ToolActions`, while the dialog is open */
export const ToolFooterProvider = FooterContext.Provider;

/** Renders its children (e.g. downloads) in the footer of the tool's dialog */
export function ToolActions({ children }: { children: ReactNode }) {
  const footer = useContext(FooterContext);
  return footer && createPortal(children, footer);
}
