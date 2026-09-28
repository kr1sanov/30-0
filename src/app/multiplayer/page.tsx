import { notFound } from 'next/navigation';

// The mode is hidden until its redesign is ready. Keep the previous client
// implementation outside the route so existing invite links cannot open it.
export default function MultiplayerPage() {
  notFound();
}
