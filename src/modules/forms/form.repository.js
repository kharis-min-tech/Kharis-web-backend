import { supabase } from '../../config/supabase.js';
import { BRANCHES } from '../../shared/utils/table.js';

export const formRepository = {
  async branches() {
    const { data, error } = await supabase
      .from(BRANCHES)
      .select('id, name, workspace, contact_email')
      .eq('is_active', true);

    if (error) throw error;
    return data ?? [];
  },

  async insert(table, row) {
    const { data, error } = await supabase
      .from(table)
      .insert(row)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },
};
