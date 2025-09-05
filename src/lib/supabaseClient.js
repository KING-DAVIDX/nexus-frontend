import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cdvmjrpmrhvzwjutjqwc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdm1qcnBtcmh2endqdXRqcXdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc4MjIzNywiZXhwIjoyMDY5MzU4MjM3fQ.XngWATkln_MgRDU8mog9DJjQ_wUwzy5GbyrRlSMULSc'

export const supabase = createClient(supabaseUrl, supabaseKey)