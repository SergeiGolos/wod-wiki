'use client';
import { User } from '@supabase/supabase-js';
import { createClient } from '../../../utils/supabase/client';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { WodContainer } from '../WodContainer';
import { WodRow } from '../../../supabase-types';

interface HomeProps {
  user: User;
  content: WodRow | undefined;
}

export function Home({ user, content }: HomeProps) {
  function handleSignOut(): void {
    createClient().auth.signOut();
    redirect('/');
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Header handleSignOut={handleSignOut} setMobileMenuOpen={setMobileMenuOpen} />
      <MobileMenu mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} handleSignOut={handleSignOut} />
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        <WodContainer code={content?.wod || ""} />      
      </div>
    </>
  );
}
