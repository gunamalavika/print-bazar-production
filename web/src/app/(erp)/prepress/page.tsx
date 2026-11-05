import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function PrepressIndexPage() {
  redirect('/prepress/artwork');
}
