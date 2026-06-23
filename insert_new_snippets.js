const Database = require('better-sqlite3');
const db = new Database('instruction_creator.db');

const newSnippets = [
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

const checkSnippet = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE title = ?');
const insert = db.prepare('INSERT INTO snippets (title, content, order_index, category_id) VALUES (@title, @content, @order_index, @category_id)');

db.transaction((snippets) => {
  for (const snippet of snippets) {
    const res = checkSnippet.get(snippet.title);
    if (res.count === 0) {
      insert.run(snippet);
      console.log(`Inserted snippet: ${snippet.title}`);
    } else {
      console.log(`Snippet already exists, skipping: ${snippet.title}`);
    }
  }
})(newSnippets);

console.log("Database verification complete.");
db.close();
