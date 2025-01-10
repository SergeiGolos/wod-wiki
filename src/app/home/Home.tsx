'use client';
import { User } from '@supabase/supabase-js';
import { createClient } from '../../utils/supabase/client';
import { redirect } from 'next/navigation';

interface HomeProps {
  user: User;
}

export function Home({ user }: HomeProps) {
    
    function handleSignOut(): void {
        createClient().auth.signOut();
        redirect('/');
    }

  return (
    <div>
      <h1>Welcome {user.email}</h1>
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}