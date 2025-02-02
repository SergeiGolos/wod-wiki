import { redirect } from 'next/navigation';
import { createClient } from '../../../utils/supabase/server';
import { Home } from '../../components/home/Home';

export default async function WodPage({ params }: { params: { slug: string } }) {  
  const supabase = await createClient();  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) {    
    redirect('/login');
  }
  
  const query = await params;
  console.log('Searching for slug:', query.slug); // Debug log
  
  const { data: pageData, error: pageError } = await supabase
    .from('wods')    
    .select('*')
    .ilike('slug', query.slug) // Changed from eq to ilike for case-insensitive match
    .limit(1); // Add limit for efficiency

  if (pageError) {
    console.error('Error fetching page data:', pageError);
    return <div>
      <div> Slug: {JSON.stringify(query)}</div>
      <div> Response: {JSON.stringify(pageData)}</div>
      <div> Error {JSON.stringify(pageError)}</div>
    </div>;
  }
  
  console.log('Query result:', pageData); // Debug log
  
  if (pageData.length === 0) {
    console.warn('No data found for slug:', query.slug);
    return <div>
      <div> Slug: {JSON.stringify(query)}</div>
      <div> Response: {JSON.stringify(pageData)}</div>
      <div> Error {JSON.stringify(pageError)}</div>
    </div>;
  }
  
  return <Home user={user} content={pageData[0]} />;
}
