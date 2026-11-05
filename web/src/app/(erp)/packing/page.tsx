import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function PackingIndexPage() {
  redirect('/packing/station');
}
