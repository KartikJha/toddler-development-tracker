
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyFormbody from '@fastify/formbody';
import { readFile, writeFile, access, constants } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, 'data', 'data.json');
const SCHEMA_FILE = join(__dirname, 'data', 'toddler_tracker_json.json');

const app = Fastify({ logger: true });

await app.register(fastifyCors, { origin: true });
await app.register(fastifyFormbody);
await app.register(fastifyStatic, {
  root: join(__dirname, 'public'),
  index: ['index.html']
});

async function ensureData() {
  try {
    await access(DATA_FILE, constants.F_OK);
  } catch {
    const schema = JSON.parse(await readFile(SCHEMA_FILE, 'utf-8'));
    await writeFile(DATA_FILE, JSON.stringify(schema, null, 2));
  }
}

async function readData() {
  await ensureData();
  const txt = await readFile(DATA_FILE, 'utf-8');
  return JSON.parse(txt);
}

async function writeData(obj) {
  await writeFile(DATA_FILE, JSON.stringify(obj, null, 2));
}

app.get('/api/schema', async () => {
  return JSON.parse(await readFile(SCHEMA_FILE, 'utf-8'));
});

app.get('/api/app', async () => {
  return await readData();
});

app.put('/api/child', async (req, reply) => {
  const { name, birth_date, current_age_months } = req.body || {};
  if (!name || !birth_date || typeof current_age_months !== 'number') {
    return reply.code(400).send({ error: 'name, birth_date, current_age_months required' });
  }
  const data = await readData();
  data.child_info = { name, birth_date, current_age_months };
  await writeData(data);
  return { ok: true, child_info: data.child_info };
});

app.put('/api/tracking', async (req, reply) => {
  const { age_months, area, milestone, observed = null, notes = '' } = req.body || {};
  if (!age_months || !area || !milestone) {
    return reply.code(400).send({ error: 'age_months, area, milestone required' });
  }
  const data = await readData();
  data.tracking_data = data.tracking_data || {};
  data.tracking_data[age_months] = data.tracking_data[age_months] || {};
  data.tracking_data[age_months][area] = data.tracking_data[age_months][area] || {};
  data.tracking_data[age_months][area][milestone] = data.tracking_data[age_months][area][milestone] || {};
  data.tracking_data[age_months][area][milestone].observed = observed;
  data.tracking_data[age_months][area][milestone].notes = notes;
  data.tracking_data[age_months][area][milestone].date_observed = observed ? new Date().toISOString().slice(0,10) : null;
  await writeData(data);
  return { ok: true, updated: data.tracking_data[age_months][area][milestone] };
});

app.post('/api/import', async (req, reply) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return reply.code(400).send({ error: 'JSON body required' });
  }
  await writeData(payload);
  return { ok: true };
});

app.get('/api/export', async (req, reply) => {
  await ensureData();
  reply.header('Content-Type', 'application/json');
  reply.header('Content-Disposition', 'attachment; filename="toddler_data_export.json"');
  return createReadStream(DATA_FILE);
});

app.post('/api/reset', async () => {
  const schema = JSON.parse(await readFile(SCHEMA_FILE, 'utf-8'));
  await writeData(schema);
  return { ok: true };
});

app.get('/', async (req, reply) => {
  return reply.sendFile('index.html');
});

const port = process.env.PORT || 3000;
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`Server listening on http://localhost:${port}`);
}).catch(err => {
  app.log.error(err);
  process.exit(1);
});
