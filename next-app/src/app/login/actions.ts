"use client";
import { createClient } from '@/utils/supabase/client'
import { Provider } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export async function login(provider: Provider) {
    await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `http://localhost:3000/auth/callback`,
      },
    });
  }
  
  export async function logout() {
    await createClient().auth.signOut();
    redirect('/');    
  }