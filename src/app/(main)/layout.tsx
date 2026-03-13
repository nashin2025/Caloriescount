import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BottomNav from '@/components/shared/BottomNav';
import Header from '@/components/shared/Header';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile?.onboarding_complete) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header user={profile} />
      <main className="px-4 py-2">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
