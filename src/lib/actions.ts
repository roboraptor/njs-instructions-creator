'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';

export interface Category {
  id: number;
  name: string;
  header_text: string;
  order_index: number;
  parent_id: number | null;
}

export interface Snippet {
  id: number;
  title: string;
  content: string;
  order_index: number;
  category_id: number | null;
}

export interface Preset {
  id: number;
  name: string;
  snippet_ids: string; // JSON string of number[]
}

// Category Server Actions
export async function getCategories(): Promise<Category[]> {
  const stmt = db.prepare('SELECT * FROM categories ORDER BY order_index ASC');
  return stmt.all() as Category[];
}

export async function addCategory(formData: FormData) {
  const name = formData.get('name') as string;
  const header_text = formData.get('header_text') as string;
  const parentIdStr = formData.get('parent_id') as string;
  const parent_id = parentIdStr && parentIdStr !== "" ? parseInt(parentIdStr) : null;

  let order_index: number;
  const orderIndexStr = formData.get('order_index') as string;
  if (orderIndexStr && orderIndexStr.trim() !== "") {
    order_index = parseInt(orderIndexStr);
  } else {
    // Auto-assign order index (max index + 1)
    const stmt = parent_id !== null
      ? db.prepare('SELECT MAX(order_index) as max_index FROM categories WHERE parent_id = ?')
      : db.prepare('SELECT MAX(order_index) as max_index FROM categories WHERE parent_id IS NULL');
    const row = (parent_id !== null ? stmt.get(parent_id) : stmt.get()) as { max_index: number | null };
    order_index = (row?.max_index !== null ? row.max_index : 0) + 1;
  }

  const stmt = db.prepare(
    'INSERT INTO categories (name, header_text, order_index, parent_id) VALUES (@name, @header_text, @order_index, @parent_id)'
  );
  
  stmt.run({ name, header_text, order_index, parent_id });

  revalidatePath('/');
  revalidatePath('/settings');
}

export async function updateCategory(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const header_text = formData.get('header_text') as string;
  const order_index = parseInt(formData.get('order_index') as string) || 0;
  const parentIdStr = formData.get('parent_id') as string;
  const parent_id = parentIdStr && parentIdStr !== "" ? parseInt(parentIdStr) : null;

  const stmt = db.prepare(
    'UPDATE categories SET name = @name, header_text = @header_text, order_index = @order_index, parent_id = @parent_id WHERE id = @id'
  );
  
  stmt.run({ name, header_text, order_index, parent_id, id });

  revalidatePath('/');
  revalidatePath('/settings');
}

export async function deleteCategory(id: number) {
  const stmt = db.prepare('DELETE FROM categories WHERE id = @id');
  stmt.run({ id });

  revalidatePath('/');
  revalidatePath('/settings');
}

// Snippet Server Actions
export async function getSnippets(): Promise<Snippet[]> {
  const stmt = db.prepare('SELECT * FROM snippets ORDER BY order_index ASC');
  return stmt.all() as Snippet[];
}

export async function addSnippet(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const catIdStr = formData.get('category_id') as string;
  const category_id = catIdStr && catIdStr !== "" ? parseInt(catIdStr) : null;

  let order_index: number;
  const orderIndexStr = formData.get('order_index') as string;
  if (orderIndexStr && orderIndexStr.trim() !== "") {
    order_index = parseInt(orderIndexStr);
  } else {
    // Auto-assign order index (max index + 1)
    const stmt = category_id !== null
      ? db.prepare('SELECT MAX(order_index) as max_index FROM snippets WHERE category_id = ?')
      : db.prepare('SELECT MAX(order_index) as max_index FROM snippets WHERE category_id IS NULL');
    const row = (category_id !== null ? stmt.get(category_id) : stmt.get()) as { max_index: number | null };
    order_index = (row?.max_index !== null ? row.max_index : 0) + 1;
  }

  const stmt = db.prepare(
    'INSERT INTO snippets (title, content, order_index, category_id) VALUES (@title, @content, @order_index, @category_id)'
  );
  
  stmt.run({ title, content, order_index, category_id });

  revalidatePath('/');
  revalidatePath('/settings');
}

export async function updateSnippet(id: number, formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const order_index = parseInt(formData.get('order_index') as string) || 0;
  const catIdStr = formData.get('category_id') as string;
  const category_id = catIdStr && catIdStr !== "" ? parseInt(catIdStr) : null;

  const stmt = db.prepare(
    'UPDATE snippets SET title = @title, content = @content, order_index = @order_index, category_id = @category_id WHERE id = @id'
  );
  
  stmt.run({ title, content, order_index, category_id, id });

  revalidatePath('/');
  revalidatePath('/settings');
}

export async function deleteSnippet(id: number) {
  const stmt = db.prepare('DELETE FROM snippets WHERE id = @id');
  stmt.run({ id });

  revalidatePath('/');
  revalidatePath('/settings');
}

// Preset Server Actions
export async function getPresets(): Promise<Preset[]> {
  const stmt = db.prepare('SELECT * FROM presets ORDER BY name ASC');
  return stmt.all() as Preset[];
}

export async function addPreset(name: string, snippetIds: number[]) {
  const snippet_ids = JSON.stringify(snippetIds);
  const stmt = db.prepare('INSERT INTO presets (name, snippet_ids) VALUES (@name, @snippet_ids)');
  stmt.run({ name, snippet_ids });

  revalidatePath('/');
  revalidatePath('/settings');
}

export async function updatePreset(id: number, name: string, snippetIds: number[]) {
  const snippet_ids = JSON.stringify(snippetIds);
  const stmt = db.prepare('UPDATE presets SET name = @name, snippet_ids = @snippet_ids WHERE id = @id');
  stmt.run({ name, snippet_ids, id });

  revalidatePath('/');
  revalidatePath('/settings');
}

export async function deletePreset(id: number) {
  const stmt = db.prepare('DELETE FROM presets WHERE id = @id');
  stmt.run({ id });

  revalidatePath('/');
  revalidatePath('/settings');
}

// Database Import/Export Server Actions
export async function importDatabaseData(
  categories: any[],
  snippets: any[],
  presets: any[],
  clearFirst: boolean
) {
  const dbTransaction = db.transaction(() => {
    if (clearFirst) {
      db.prepare('DELETE FROM snippets').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM presets').run();
    }

    // 1. Insert or replace categories (order index & parents)
    const insertCat = db.prepare(`
      INSERT OR REPLACE INTO categories (id, name, header_text, order_index, parent_id)
      VALUES (@id, @name, @header_text, @order_index, @parent_id)
    `);
    for (const cat of categories) {
      insertCat.run({
        id: cat.id || null,
        name: cat.name,
        header_text: cat.header_text,
        order_index: cat.order_index || 0,
        parent_id: cat.parent_id !== undefined ? cat.parent_id : null
      });
    }

    // 2. Insert or replace snippets
    const insertSnip = db.prepare(`
      INSERT OR REPLACE INTO snippets (id, title, content, order_index, category_id)
      VALUES (@id, @title, @content, @order_index, @category_id)
    `);
    for (const snip of snippets) {
      insertSnip.run({
        id: snip.id || null,
        title: snip.title,
        content: snip.content,
        order_index: snip.order_index || 0,
        category_id: snip.category_id !== undefined ? snip.category_id : null
      });
    }

    // 3. Insert or replace presets
    const insertPreset = db.prepare(`
      INSERT OR REPLACE INTO presets (id, name, snippet_ids)
      VALUES (@id, @name, @snippet_ids)
    `);
    for (const preset of presets) {
      insertPreset.run({
        id: preset.id || null,
        name: preset.name,
        snippet_ids: typeof preset.snippet_ids === 'string' ? preset.snippet_ids : JSON.stringify(preset.snippet_ids)
      });
    }
  });

  dbTransaction();

  revalidatePath('/');
  revalidatePath('/settings');
}

export interface TreeRow {
  level1?: string | number;
  level2?: string | number;
  level3?: string | number;
  level4?: string | number;
  level5?: string | number;
  header_text?: string;
  snippet_title?: string;
  snippet_content?: string;
  type: string; // 'Category' | 'Snippet'
  id?: number | null;
  order_index?: number | null;
}

export async function importTreeDatabaseData(
  rows: TreeRow[],
  presets: any[],
  clearFirst: boolean
) {
  const dbTransaction = db.transaction(() => {
    if (clearFirst) {
      db.prepare('DELETE FROM snippets').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM presets').run();
    }

    // Map: full path (trimmed, lowercase) -> resolved ID in DB
    const pathMap = new Map<string, number>();

    // If NOT clearFirst, pre-load existing categories into the path map
    if (!clearFirst) {
      const allCats = db.prepare('SELECT * FROM categories').all() as Category[];
      const catMap = new Map<number, Category>();
      for (const cat of allCats) {
        catMap.set(cat.id, cat);
      }

      const getFullPath = (catId: number): string[] => {
        const cat = catMap.get(catId);
        if (!cat) return [];
        if (cat.parent_id === null) return [cat.name.trim().toLowerCase()];
        return [...getFullPath(cat.parent_id), cat.name.trim().toLowerCase()];
      };

      for (const cat of allCats) {
        const pathArr = getFullPath(cat.id);
        if (pathArr.length > 0) {
          pathMap.set(pathArr.join(' > '), cat.id);
        }
      }
    }

    // Process rows sequentially
    for (const row of rows) {
      // Reconstruct category path from level1 to level5
      const rawPath = [row.level1, row.level2, row.level3, row.level4, row.level5]
        .map(p => p?.toString().trim())
        .filter(Boolean) as string[];

      if (rawPath.length === 0) {
        if (row.type === 'Snippet') {
          const title = row.snippet_title || '';
          const content = row.snippet_content || '';
          const orderIndex = row.order_index || 0;
          if (row.id) {
            const existing = db.prepare('SELECT id FROM snippets WHERE id = ?').get(row.id) as { id: number } | undefined;
            if (existing) {
              db.prepare('UPDATE snippets SET title = @title, content = @content, order_index = @order_index, category_id = NULL WHERE id = @id').run({
                id: row.id,
                title,
                content,
                order_index: orderIndex
              });
            } else {
              db.prepare('INSERT INTO snippets (id, title, content, order_index, category_id) VALUES (@id, @title, @content, @order_index, NULL)').run({
                id: row.id,
                title,
                content,
                order_index: orderIndex
              });
            }
          } else {
            db.prepare('INSERT INTO snippets (title, content, order_index, category_id) VALUES (@title, @content, @order_index, NULL)').run({
              title,
              content,
              order_index: orderIndex
            });
          }
        }
        continue;
      }

      const pathKey = rawPath.map(p => p.toLowerCase()).join(' > ');

      if (row.type === 'Category') {
        const catName = rawPath[rawPath.length - 1];
        const parentPathArr = rawPath.slice(0, -1);
        const parentKey = parentPathArr.map(p => p.toLowerCase()).join(' > ');
        const parentId = parentPathArr.length > 0 ? pathMap.get(parentKey) : null;

        let resolvedId: number | null = null;

        if (row.id) {
          // If explicit ID is provided, check if it exists
          const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(row.id) as { id: number } | undefined;
          if (existing) {
            // Update existing
            db.prepare(`
              UPDATE categories 
              SET name = @name, header_text = @header_text, order_index = @order_index, parent_id = @parent_id 
              WHERE id = @id
            `).run({
              id: row.id,
              name: catName,
              header_text: row.header_text || '',
              order_index: row.order_index || 0,
              parent_id: parentId !== undefined ? parentId : null
            });
            resolvedId = row.id;
          } else {
            // Insert with explicit ID
            db.prepare(`
              INSERT INTO categories (id, name, header_text, order_index, parent_id)
              VALUES (@id, @name, @header_text, @order_index, @parent_id)
            `).run({
              id: row.id,
              name: catName,
              header_text: row.header_text || '',
              order_index: row.order_index || 0,
              parent_id: parentId !== undefined ? parentId : null
            });
            resolvedId = row.id;
          }
        } else {
          // No explicit ID provided, check if category path already exists in our map
          const mappedId = pathMap.get(pathKey);
          if (mappedId !== undefined) {
            // Update it
            db.prepare(`
              UPDATE categories 
              SET name = @name, header_text = @header_text, order_index = @order_index, parent_id = @parent_id 
              WHERE id = @id
            `).run({
              id: mappedId,
              name: catName,
              header_text: row.header_text || '',
              order_index: row.order_index || 0,
              parent_id: parentId !== undefined ? parentId : null
            });
            resolvedId = mappedId;
          } else {
            // Check if there is an existing category with same name & parent_id in database
            const dup = parentId !== null
              ? db.prepare('SELECT id FROM categories WHERE name = ? AND parent_id = ?').get(catName, parentId)
              : db.prepare('SELECT id FROM categories WHERE name = ? AND parent_id IS NULL').get(catName);

            if (dup) {
              const dupId = (dup as { id: number }).id;
              db.prepare(`
                UPDATE categories 
                SET header_text = @header_text, order_index = @order_index 
                WHERE id = @id
              `).run({
                id: dupId,
                header_text: row.header_text || '',
                order_index: row.order_index || 0
              });
              resolvedId = dupId;
            } else {
              // Create new
              const info = db.prepare(`
                INSERT INTO categories (name, header_text, order_index, parent_id)
                VALUES (@name, @header_text, @order_index, @parent_id)
              `).run({
                name: catName,
                header_text: row.header_text || '',
                order_index: row.order_index || 0,
                parent_id: parentId !== undefined ? parentId : null
              });
              resolvedId = Number(info.lastInsertRowid);
            }
          }
        }

        if (resolvedId !== null) {
          pathMap.set(pathKey, resolvedId);
        }
      } else if (row.type === 'Snippet') {
        const categoryId = pathMap.get(pathKey) || null;
        const title = row.snippet_title || '';
        const content = row.snippet_content || '';
        const orderIndex = row.order_index || 0;

        if (row.id) {
          const existing = db.prepare('SELECT id FROM snippets WHERE id = ?').get(row.id) as { id: number } | undefined;
          if (existing) {
            db.prepare(`
              UPDATE snippets 
              SET title = @title, content = @content, order_index = @order_index, category_id = @category_id 
              WHERE id = @id
            `).run({
              id: row.id,
              title,
              content,
              order_index: orderIndex,
              category_id: categoryId
            });
          } else {
            db.prepare(`
              INSERT INTO snippets (id, title, content, order_index, category_id)
              VALUES (@id, @title, @content, @order_index, @category_id)
            `).run({
              id: row.id,
              title,
              content,
              order_index: orderIndex,
              category_id: categoryId
            });
          }
        } else {
          db.prepare(`
            INSERT INTO snippets (title, content, order_index, category_id)
            VALUES (@title, @content, @order_index, @category_id)
          `).run({
            title,
            content,
            order_index: orderIndex,
            category_id: categoryId
          });
        }
      }
    }

    // Process presets if any
    if (presets && presets.length > 0) {
      const insertPreset = db.prepare(`
        INSERT OR REPLACE INTO presets (id, name, snippet_ids)
        VALUES (@id, @name, @snippet_ids)
      `);
      for (const preset of presets) {
        insertPreset.run({
          id: preset.id || null,
          name: preset.name,
          snippet_ids: typeof preset.snippet_ids === 'string' ? preset.snippet_ids : JSON.stringify(preset.snippet_ids)
        });
      }
    }
  });

  dbTransaction();

  revalidatePath('/');
  revalidatePath('/settings');
}

