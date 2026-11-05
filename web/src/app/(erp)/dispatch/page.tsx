import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function DispatchIndexPage() {
  redirect('/dispatch/manifest');
}
