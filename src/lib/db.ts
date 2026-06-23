import Database from 'better-sqlite3';
import path from 'path';

// Resolve the path relative to the current working directory to keep it in the project root
const dbPath = path.join(process.cwd(), 'instruction_creator.db');
const db = new Database(dbPath);

// Initialize the database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    header_text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    snippet_ids TEXT NOT NULL
  );
`);

// Safely alter categories table to add parent_id column if not exists
try {
  db.exec('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
} catch (error) {
  // column already exists, ignore error
}

// Safely alter snippets table to add category_id column if not exists
try {
  db.exec('ALTER TABLE snippets ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
} catch (error) {
  // column already exists, ignore error
}

// Seed categories if empty
const countCatStmt = db.prepare('SELECT COUNT(*) as count FROM categories');
const catRow = countCatStmt.get() as { count: number };

if (catRow.count === 0) {
  const insertCat = db.prepare(
    'INSERT INTO categories (name, header_text, order_index, parent_id) VALUES (@name, @header_text, @order_index, @parent_id)'
  );

  // 1. Seed Parent Categories
  const setupId = insertCat.run({ name: 'Setup', header_text: '## Project Setup ##', order_index: 1, parent_id: null }).lastInsertRowid;
  const boilerplateId = insertCat.run({ name: 'Boilerplate', header_text: '## Code Templates ##', order_index: 2, parent_id: null }).lastInsertRowid;
  insertCat.run({ name: 'Process', header_text: '## Work Processes ##', order_index: 3, parent_id: null });

  // 2. Seed Subcategories (Child Categories)
  insertCat.run({ name: 'Development Environment', header_text: '### Dev Environment ###', order_index: 1, parent_id: setupId });
  insertCat.run({ name: 'Production Deploy', header_text: '### Production Deploy ###', order_index: 2, parent_id: setupId });
  insertCat.run({ name: 'React Components', header_text: '### React Boilerplates ###', order_index: 1, parent_id: boilerplateId });

  console.log('Database seeded with initial hierarchical categories.');
}

// Helper to get category ID by name
const getCatId = (name: string): number | null => {
  const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(name) as { id: number } | undefined;
  return row ? row.id : null;
};

// Seed snippets if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM snippets');
const row = countStmt.get() as { count: number };

const devEnvId = getCatId('Development Environment');
const reactBoilerplateId = getCatId('React Components');
const prodDeployId = getCatId('Production Deploy');

if (row.count === 0) {
  const insert = db.prepare(
    'INSERT INTO snippets (title, content, order_index, category_id) VALUES (@title, @content, @order_index, @category_id)'
  );

  const seedData = [
    {
      title: 'Project Setup Instructions',
      content: '## Project Setup\n\n1. Run `npm install`\n2. Copy `.env.example` to `.env`\n3. Run `npm run dev` to start the server',
      order_index: 1,
      category_id: devEnvId,
    },
    {
      title: 'React Component Template',
      content: 'export default function MyComponent() {\n  return (\n    <div>\n      <h2>New Component</h2>\n    </div>\n  );\n}',
      order_index: 2,
      category_id: reactBoilerplateId,
    },
    {
      title: 'Deployment Checklist',
      content: '### Deployment Checklist\n\n- [ ] Run test suite (`npm test`)\n- [ ] Build production assets (`npm run build`)\n- [ ] Deploy to production environment',
      order_index: 3,
      category_id: prodDeployId,
    },
  ];

  const insertMany = db.transaction((snippets) => {
    for (const snippet of snippets) {
      insert.run(snippet);
    }
  });

  insertMany(seedData);
  console.log('Database seeded with initial snippets.');
} else {
  // Update any existing default snippets to link to their subcategories
  const updateExisting = db.prepare('UPDATE snippets SET category_id = @category_id WHERE title = @title');
  if (devEnvId) updateExisting.run({ category_id: devEnvId, title: 'Project Setup Instructions' });
  if (reactBoilerplateId) updateExisting.run({ category_id: reactBoilerplateId, title: 'React Component Template' });
  if (prodDeployId) updateExisting.run({ category_id: prodDeployId, title: 'Deployment Checklist' });
}

// Seed new useful prompts if they don't exist
const checkSnippet = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE title = ?');
const insertSnippet = db.prepare(
  'INSERT INTO snippets (title, content, order_index, category_id) VALUES (@title, @content, @order_index, @category_id)'
);

const additionalSnippets = [
  {
    title: 'Agent Tool Protocol',
    content: 'You have shell command execution capabilities. Proactively execute compiler builds (e.g., `npx tsc --noEmit`) and review dev logs to verify code changes before marking tasks as complete.',
    order_index: 2,
    category_id: 4
  },
  {
    title: 'API Router Standard',
    content: '- **API Route Standard:** Place server-only processing logic in Next.js Route Handlers (`src/app/api/...`). Keep payloads small and return standardized JSON objects with appropriate HTTP status codes.',
    order_index: 7,
    category_id: 5
  },
  {
    title: 'Dictionary Strategy',
    content: '- **Localization Dictionary:** Store locales in `src/locales/` as static JSON schema files. Access keys using a custom React Context Provider or wrapper Hook instead of importing third-party libraries.',
    order_index: 1,
    category_id: 8
  },
  {
    title: 'Clean Logs & Debugging',
    content: '- **Console Logging:** Clean up all debugging `console.log` statements before submitting your work. Server logs must remain clean and readable, logging only production error warnings.',
    order_index: 4,
    category_id: 11
  },
  {
    title: 'Pagination and Filtering',
    content: '- **Pagination & Filtering:** Provide paginated tables or lazy-loading lists with query param filter controls to handle database records efficiently without overloading the browser thread.',
    order_index: 1,
    category_id: 12
  },
  {
    title: 'Brief Explanations',
    content: '- **Brief Explanations:** Answer questions concisely. Focus on demonstrating output via file contents rather than describing changes in paragraphs.',
    order_index: 5,
    category_id: 13
  }
];

for (const snip of additionalSnippets) {
  const res = checkSnippet.get(snip.title) as { count: number };
  if (res.count === 0) {
    insertSnippet.run(snip);
  }
}

export default db;
