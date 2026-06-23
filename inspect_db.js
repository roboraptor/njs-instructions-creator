const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('instruction_creator.db');

// Add new useful snippets to categories if they don't exist
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
  const res = checkSnippet.get(snip.title);
  if (res.count === 0) {
    insertSnippet.run(snip);
  }
}
console.log("Verified/inserted additional useful snippets in DB.");

let md = "# SQLite Database Inspection\n\n";

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

for (const table of tables) {
  const tableName = table.name;
  if (tableName.startsWith('sqlite_')) continue;
  
  md += `## Table: \`${tableName}\`\n\n`;
  
  // Schema
  md += "### Schema\n\n";
  md += "| Column | Type | Not Null | Default | PK |\n";
  md += "|---|---|---|---|---|\n";
  const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
  for (const col of schema) {
    md += `| ${col.name} | ${col.type} | ${col.notnull} | ${col.dflt_value} | ${col.pk} |\n`;
  }
  md += "\n";
  
  // Data
  md += "### Data\n\n";
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) {
    md += "*No rows found.*\n\n";
  } else {
    const headers = Object.keys(rows[0]);
    md += "| " + headers.join(" | ") + " |\n";
    md += "| " + headers.map(() => "---").join(" | ") + " |\n";
    for (const row of rows) {
      const vals = headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) return "NULL";
        if (typeof val === 'string') {
          val = val.replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
          if (val.length > 150) {
            val = val.substring(0, 150) + "...";
          }
        }
        return val;
      });
      md += "| " + vals.join(" | ") + " |\n";
    }
    md += "\n";
  }
}

fs.writeFileSync('db_dump.md', md, 'utf-8');
console.log("Successfully wrote db_dump.md");

// Dump categories and snippets to AIsnip.json
const categories = db.prepare("SELECT * FROM categories ORDER BY order_index ASC").all();
const snippets = db.prepare("SELECT * FROM snippets ORDER BY order_index ASC").all();
fs.writeFileSync('AIsnip.json', JSON.stringify({ categories, snippets }, null, 2), 'utf-8');
console.log("Successfully updated AIsnip.json with database values");

db.close();
