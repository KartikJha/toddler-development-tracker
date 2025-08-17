import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyFormbody from '@fastify/formbody';
import { readFile, writeFile, access, constants } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, 'data', 'data.json');
const SCHEMA_FILE = join(__dirname, 'data', 'toddler_tracker_json.json');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

async function authenticateToken(req, reply) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return reply.code(403).send({ error: 'Invalid token' });
  }
}

const app = Fastify({ logger: true });

await app.register(fastifyCors, { origin: true });
await app.register(fastifyFormbody);
await app.register(fastifyStatic, {
  root: join(__dirname, 'public'),
  index: ['index.html']
});

app.addHook('preHandler', async (req, reply) => {
  const publicPaths = [
    '/api/auth/register',
    '/api/auth/login',
    '/',
    '/index.html',
    '/js'
  ];

  if (req.routerPath && !publicPaths.some(path => req.routerPath.startsWith(path))) {
    await authenticateToken(req, reply);
  }
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

app.post('/api/auth/register', async (req, reply) => {
  const { email, password, name, relationship } = req.body || {};
  
  if (!email || !password) {
    return reply.code(400).send({ error: 'email and password required' });
  }

  try {
    const data = await readData();
    
    // Check if user exists
    if (data.auth?.credentials?.email === email) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Update auth data
    data.auth = {
      credentials: {
        email,
        password_hash,
        last_login: null
      }
    };

    // Add optional parent info
    if (name || relationship) {
      data.child_info = data.child_info || {};
      data.child_info.parent_info = {
        primary: {
          name: name || 'Parent',
          relationship: relationship || 'parent',
          email,
          preferred_contact: 'email'
        }
      };
    }

    await writeData(data);

    // Generate token
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    
    return { 
      ok: true, 
      token,
      user: {
        email,
        name: data.child_info?.parent_info?.primary?.name
      }
    };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, reply) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return reply.code(400).send({ error: 'email and password required' });
  }

  try {
    const data = await readData();
    const stored = data.auth?.credentials;

    if (!stored || stored.email !== email) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, stored.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Update last login
    data.auth.credentials.last_login = new Date().toISOString();
    await writeData(data);

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    
    return { 
      ok: true, 
      token,
      user: {
        email,
        name: data.child_info?.parent_info?.primary?.name
      }
    };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Login failed' });
  }
});

app.put('/api/parent', async (req, reply) => {
  const { primary, secondary } = req.body || {};
  
  if (!primary && !secondary) {
    return reply.code(400).send({ error: 'primary or secondary parent info required' });
  }

  try {
    const data = await readData();
    data.child_info = data.child_info || {};
    data.child_info.parent_info = data.child_info.parent_info || {};

    if (primary) {
      data.child_info.parent_info.primary = {
        ...data.child_info.parent_info.primary,
        ...primary
      };
    }

    if (secondary) {
      data.child_info.parent_info.secondary = {
        ...data.child_info.parent_info.secondary,
        ...secondary
      };
    }

    await writeData(data);
    return { ok: true, parent_info: data.child_info.parent_info };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to update parent info' });
  }
});

app.put('/api/auth', async (req, reply) => {
  const { current_password, new_password, email } = req.body || {};
  
  if (!current_password || !new_password) {
    return reply.code(400).send({ error: 'current and new password required' });
  }

  try {
    const data = await readData();
    const stored = data.auth?.credentials;

    if (!stored) {
      return reply.code(404).send({ error: 'No auth data found' });
    }

    const valid = await bcrypt.compare(current_password, stored.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid current password' });
    }

    // Update password
    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    data.auth.credentials.password_hash = password_hash;

    // Update email if provided
    if (email && email !== stored.email) {
      data.auth.credentials.email = email;
    }

    await writeData(data);
    return { ok: true, email: data.auth.credentials.email };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Failed to update auth info' });
  }
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
