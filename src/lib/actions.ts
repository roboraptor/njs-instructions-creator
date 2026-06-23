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
