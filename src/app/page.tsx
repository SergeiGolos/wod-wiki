import { redirect } from 'next/navigation';
import { createClient } from '../utils/supabase/server';
import { Home } from './home/Home';

export default async function Page() {  
  const supabase = await createClient();  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) {    
    redirect('/login');
  }
  
  return <Home user={user} />;
}