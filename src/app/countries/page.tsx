import { createClient } from '../../utils/supabase/server'

export default async function CountriesPage() {
  const supabase = await createClient()
  
  const { data: countries, error } = await supabase
    .from('countries')
    .select('*')
    .order('name')
  
  if (error) {
    return <div>Error loading countries: {error.message}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Countries</h1>
      <div className="grid gap-4">
        {countries?.map((country) => (
          <div key={country.id} className="p-4 border rounded-lg shadow">
            <h2 className="font-semibold">{country.name}</h2>
          </div>
        ))}
      </div>
    </div>
  )
}