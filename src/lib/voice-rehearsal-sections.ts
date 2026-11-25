import type { SupabaseClient } from '@supabase/supabase-js';

type RehearsalSectionPosition = {
  id: string;
  name: string;
  position: number;
};

/** Keep section order and generated section names aligned after removals. */
export async function normalizeRehearsalSections(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('rehearsal_sections')
    .select('id, name, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) throw new Error(`Could not load song sections: ${error.message}`);

  const sections = (data ?? []) as RehearsalSectionPosition[];
  if (sections.length === 0) return sections;

  const ordered = [...sections].sort((a, b) => {
    if (a.name === 'Recorded parts' && b.name !== 'Recorded parts') return -1;
    if (b.name === 'Recorded parts' && a.name !== 'Recorded parts') return 1;
    return a.position - b.position;
  });

  // Move all rows out of the destination range first, avoiding the project's
  // unique (project_id, position) index while compacting the positions.
  const temporaryPositionStart = Math.max(...ordered.map((section) => section.position)) + ordered.length + 1;
  for (const [index, section] of ordered.entries()) {
    const { error: moveError } = await supabase
      .from('rehearsal_sections')
      .update({ position: temporaryPositionStart + index })
      .eq('id', section.id)
      .eq('project_id', projectId);
    if (moveError) throw new Error(`Could not reorder song sections: ${moveError.message}`);
  }

  const normalized: RehearsalSectionPosition[] = [];
  for (const [index, section] of ordered.entries()) {
    const position = index;
    const name = ordered.length === 1
      ? 'Recorded parts'
      : /^Section \d+$/.test(section.name)
        ? `Section ${position + 1}`
        : section.name;
    const { data: updated, error: updateError } = await supabase
      .from('rehearsal_sections')
      .update({ name, position })
      .eq('id', section.id)
      .eq('project_id', projectId)
      .select('id, name, position')
      .single();
    if (updateError || !updated) {
      throw new Error(`Could not finish reordering song sections: ${updateError?.message ?? 'section not found'}`);
    }
    normalized.push(updated as RehearsalSectionPosition);
  }

  return normalized;
}
