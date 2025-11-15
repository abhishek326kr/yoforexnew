import { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return children; // Root layout handles html/body
}
