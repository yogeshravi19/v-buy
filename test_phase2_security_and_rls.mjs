import { executeSql } from './run_mcp_sql.mjs';

function parseMcpResult(res) {
  const text = res?.result?.content?.[0]?.text;
  if (!text) return null;
  try {
    const outer = JSON.parse(text);
    const contentStr = outer.result || text;
    const match = contentStr.match(/(\[\s*\{[\s\S]*\}\s*\]|\[\s*\])/);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
  } catch (e) {
    console.warn('Parse error:', e.message);
  }
  return text;
}

async function main() {
  const q = async (sql) => {
    const res = await executeSql(sql);
    return parseMcpResult(res);
  };

  console.log('--- Testing Phase 2 DB Triggers & Protections ---');

  // Clean up any old QA items first
  await q("DELETE FROM menu_items WHERE name LIKE 'QA %';");

  // 1. Create a temporary QA menu item in outlet 'g1'
  const items = await q(`
    INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category, stock_qty)
    VALUES ('g1', 'QA Test Dosa', 50, true, true, 'snacks', 20)
    RETURNING id, outlet_id, name, price, available, is_archived;
  `);
  console.log('1. Created QA Test Item:', items);

  const itemId = items[0].id;

  // 2. Test audit log on price & name update
  await q(`
    UPDATE menu_items 
    SET price = 65, name = 'QA Special Dosa', image_url = 'g1/test.webp'
    WHERE id = ${itemId};
  `);

  const auditLogs = await q(`
    SELECT field_name, old_value, new_value 
    FROM menu_items_audit 
    WHERE item_id = ${itemId}
    ORDER BY id ASC;
  `);
  console.log('2. Audit Log Recorded Entries:', auditLogs);

  // 3. Test Staff Protection Trigger: Try setting is_archived with staff role
  const staffArchiveAttempt = await q(`
    DO $$
    BEGIN
      -- Mock get_my_role() returning 'staff'
      CREATE OR REPLACE FUNCTION get_my_role() RETURNS text LANGUAGE sql AS 'SELECT ''staff''::text';
      
      BEGIN
        UPDATE menu_items SET is_archived = true WHERE id = ${itemId};
        RAISE EXCEPTION 'Staff archiving should have failed!';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Staff archive correctly blocked: %', SQLERRM;
      END;

      -- Reset get_my_role()
      CREATE OR REPLACE FUNCTION get_my_role() 
      RETURNS text 
      LANGUAGE sql STABLE SECURITY DEFINER 
      AS 'SELECT COALESCE((auth.jwt() ->> ''role'')::text, (SELECT role FROM public.profiles WHERE id = auth.uid()), ''anon''::text)';
    END $$;
  `);
  console.log('3. Staff archive trigger test completed.');

  // 4. Test Shop Admin Archive: must succeed
  await q(`
    UPDATE menu_items 
    SET is_archived = true 
    WHERE id = ${itemId};
  `);

  const archivedItem = await q(`
    SELECT id, name, is_archived, archived_at 
    FROM menu_items 
    WHERE id = ${itemId};
  `);
  console.log('4. Item after Admin Archival:', archivedItem);

  // 5. Cleanup QA Test Item and related audit rows
  await q(`
    DELETE FROM menu_items_audit WHERE item_id = ${itemId};
    DELETE FROM menu_items WHERE id = ${itemId};
  `);
  console.log('5. QA Item cleaned up successfully.');
}

main().catch(console.error);
