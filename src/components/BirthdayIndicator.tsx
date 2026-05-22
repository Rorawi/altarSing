import { createClient } from '@/lib/supabase/server';
import BirthdayDropdown from './BirthdayDropdown';

function isBirthdayToday(birthDate: string): boolean {
  const today = new Date();
  const birth = new Date(birthDate);
  return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
}

export default async function BirthdayIndicator() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('choir_members')
    .select('id, name, birth_date')
    .not('birth_date', 'is', null);

  const todayBirthdays = (members ?? []).filter((m) =>
    m.birth_date ? isBirthdayToday(m.birth_date) : false,
  );

  return <BirthdayDropdown todayBirthdays={todayBirthdays} />;
}
