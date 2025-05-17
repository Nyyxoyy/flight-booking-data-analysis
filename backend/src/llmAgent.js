// src/llmAgent.js
require('dotenv').config();
const path = require('path');
const duckdb = require('duckdb');
const { Ollama } = require('@langchain/community/llms/ollama');

let dbInstance = null;
let schema = null;
let llm = null;

// 1) Initialize DuckDB and load CSVs if not already
async function initDB() {
  if (dbInstance && schema) return;
  dbInstance = new duckdb.Database(':memory:');
  const conn = dbInstance.connect();
  const dataDir = path.join(__dirname, '..', 'data');

  // Load airlines table
  await new Promise((res, rej) => {
    conn.run(
      `CREATE TABLE airlines AS
         SELECT * FROM read_csv_auto('${dataDir}/Airline ID to Name.csv');`,
      err => (err ? rej(err) : res())
    );
  });

  // Load bookings table
  await new Promise((res, rej) => {
    conn.run(
      `CREATE TABLE bookings AS
         SELECT * FROM read_csv_auto('${dataDir}/Flight Bookings.csv');`,
      err => (err ? rej(err) : res())
    );
  });

  // Convert departure_dt & arrival_dt formats
  for (const col of ['departure_dt', 'arrival_dt']) {
    await new Promise((res, rej) =>
      conn.run(
        `ALTER TABLE bookings
           ALTER COLUMN ${col} TYPE TIMESTAMP
             USING STRPTIME(${col}, '%d-%m-%Y %H:%M');`,
        err => (err ? rej(err) : res())
      )
    );
  }

  // Inspect column names
  const getCols = tbl =>
    new Promise((res, rej) =>
      conn.all(`PRAGMA table_info('${tbl}')`, (err, rows) =>
        err ? rej(err) : res(rows.map(r => r.name))
      )
    );

  const [airCols, bookCols] = await Promise.all([
    getCols('airlines'),
    getCols('bookings'),
  ]);

  schema = { airlines: airCols, bookings: bookCols };
  conn.close();
}

// 2) Initialize the Ollama LLM
function initLLM() {
  if (llm) return llm;
  llm = new Ollama({
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.LLM_MODEL || 'mistral',
    temperature: 0,
  });
  return llm;
}

// 3) Extract only the first SQL statement safely
function extractSQL(text = '') {
  const fenced = text.match(/```sql([\s\S]*?)```/i);
  let sql = fenced ? fenced[1].trim() : text.trim();
  return sql.split(/;/)[0].trim();
}

// 4) Levenshtein‐based typo fixer for column names
function levenshtein(a, b) {
  const dp = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}
function fixColumnNames(sql, schema) {
  const valid = new Set([...schema.airlines, ...schema.bookings]);
  return sql.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, tok => {
    if (valid.has(tok)) return tok;
    let best = tok, dist = Infinity;
    for (const col of valid) {
      const d = levenshtein(tok, col);
      if (d < dist) { dist = d; best = col; }
    }
    return dist <= 2 ? best : tok;
  });
}

// 5) Serialize BigInt → string to avoid JSON errors
function serializeBigIntRows(rows) {
  return rows.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = typeof v === 'bigint' ? v.toString() : v;
    }
    return out;
  });
}

// 6) Main pipeline: NL → SQL → DuckDB
async function processQuery(userQuery) {
  await initDB();
  const model = initLLM();
  const { airlines, bookings } = schema;

  const prompt = `
You are a DuckDB SQL expert. Schema:

  airlines(${airlines.join(', ')})
  bookings(${bookings.join(', ')})

❗️ No aliases—use "airlines" & "bookings".

Examples:
  -- Count per travel class:
  SELECT class, COUNT(*) AS num_bookings
    FROM bookings
   GROUP BY class
   ORDER BY num_bookings DESC;

  -- Bookings for one airline:
  SELECT airline_name, COUNT(*) AS total_bookings
    FROM bookings
    JOIN airlines ON bookings.airline_id = airlines.airline_id
   WHERE LOWER(airlines.airline_name) = LOWER('American Airlines')
   GROUP BY airline_name;

  -- Month with highest bookings in 2023:
  SELECT EXTRACT(MONTH FROM departure_dt) AS month, COUNT(*) AS total_bookings
    FROM bookings
   WHERE departure_dt >= '2023-01-01'
     AND departure_dt <  '2024-01-01'
   GROUP BY EXTRACT(MONTH FROM departure_dt)
   ORDER BY total_bookings DESC
   LIMIT 1;

  -- Count of bookings by terminal:
  SELECT terminal, COUNT(*) AS num_bookings
    FROM bookings
   GROUP BY terminal
   ORDER BY num_bookings DESC;

  -- Top 10 flights by delay (using DuckDB’s date_diff):
  SELECT flight_number, COUNT(*) AS num_delays
    FROM (
      SELECT flight_number,
             date_diff('minute', departure_dt, arrival_dt) AS delay_minutes
        FROM bookings
       WHERE date_diff('minute', departure_dt, arrival_dt) > 60
    ) AS t
   GROUP BY flight_number
   ORDER BY num_delays DESC
   LIMIT 10;

Write exactly one valid SELECT to answer:

"""${userQuery}"""
`.trim();

  // Call LLM
  let llmOut;
  try {
    llmOut = await model.call(prompt);
    if (typeof llmOut !== 'string') {
      return { type: 'string', data: `❌ LLM returned unexpected type (${typeof llmOut}).` };
    }
  } catch (e) {
    return { type: 'string', data: '❌ LLM error:\n' + e.message };
  }

  // Extract & clean SQL
  let sql = extractSQL(llmOut)
    .replace(/`/g, '')
    .replace(/\baires\./gi, 'airlines.');
  sql = fixColumnNames(sql, schema);

  if (!/^SELECT/i.test(sql.trim())) {
    return { type: 'string', data: '❌ Expected SELECT but got:\n' + sql };
  }

  // Execute in DuckDB
  const conn = dbInstance.connect();
  let rows;
  try {
    rows = await new Promise((res, rej) =>
      conn.all(sql, (err, result) => (err ? rej(err) : res(result)))
    );
  } catch (e) {
    conn.close();
    return {
      type: 'string',
      data:
        '❌ SQL execution error:\n' + e.message +
        '\n\nSQL was:\n' + sql
    };
  }
  conn.close();

  if (!rows || rows.length === 0) {
    return {
      type: 'string',
      data:
        `No results for "${userQuery}".\n` +
        `SQL tried:\n${sql}`
    };
  }

  return { type: 'table', data: serializeBigIntRows(rows) };
}

module.exports = { processQuery };
