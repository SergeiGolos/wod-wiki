'use client';
import { User } from '@supabase/supabase-js';
import { createClient } from '../../utils/supabase/client';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { WodContainer } from '../components/WodContainer';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(import('react-monaco-editor'), { ssr: false });

interface HomeProps {
  user: User;
}

export function Home({ user }: HomeProps) {
  function handleSignOut(): void {
    createClient().auth.signOut();
    redirect('/');
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Header handleSignOut={handleSignOut} setMobileMenuOpen={setMobileMenuOpen} />
      <MobileMenu mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} handleSignOut={handleSignOut} />
      <WodContainer code={''} />
      <MonacoEditor
        width="800"
        height="600"
        language="javascript"
        theme="vs-dark"
        value="// type your code..."
        options={{ selectOnLineNumbers: true }}
      />
    </>
  );
}
