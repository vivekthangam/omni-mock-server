import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

const router = Router();

interface DatabaseStore {
  [collection: string]: Array<Record<string, any>>;
}

let db: DatabaseStore = {};

function initSeededDb() {
  db = {
    users: Array.from({ length: 15 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      role: faker.helpers.arrayElement(['ADMIN', 'USER', 'EDITOR']),
      department: faker.commerce.department(),
      isActive: faker.datatype.boolean(),
      createdAt: faker.date.past().toISOString(),
    })),
    products: Array.from({ length: 15 }, () => ({
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 800 })),
      category: faker.commerce.department(),
      inStock: faker.datatype.boolean(),
      rating: parseFloat(faker.number.float({ min: 1, max: 5, multipleOf: 0.1 }).toFixed(1)),
      createdAt: faker.date.past().toISOString(),
    })),
    posts: Array.from({ length: 10 }, () => ({
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      author: faker.person.fullName(),
      likes: faker.number.int({ min: 0, max: 250 }),
      createdAt: faker.date.recent().toISOString(),
    })),
  };
}

initSeededDb();

// 1. Get all collections overview
router.get('/', (_req: Request, res: Response) => {
  const summary: Record<string, number> = {};
  for (const [key, items] of Object.entries(db)) {
    summary[key] = items.length;
  }
  res.json({
    message: 'OmniMock In-Memory Stateful Database Engine',
    collections: summary,
    features: ['Pagination (page, limit)', 'Filtering (key=val, key_gte=val)', 'Sorting (_sort, _order)', 'Search (q)'],
  });
});

// 2. Reset database
router.post('/reset', (_req: Request, res: Response) => {
  initSeededDb();
  res.json({ message: 'Database reset to initial seeded records successfully' });
});

// 3. Query Collection (List, Filter, Sort, Paginate, Search)
router.get('/:collection', (req: Request, res: Response) => {
  const { collection } = req.params;
  if (!db[collection]) {
    db[collection] = [];
  }

  let items = [...db[collection]];
  const query = req.query as Record<string, string>;

  // Global search `q`
  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter(item => JSON.stringify(item).toLowerCase().includes(q));
  }

  // Field filters
  for (const [key, val] of Object.entries(query)) {
    if (['page', 'limit', '_sort', '_order', 'q'].includes(key)) continue;

    if (key.endsWith('_gte')) {
      const field = key.replace('_gte', '');
      items = items.filter(item => Number(item[field]) >= Number(val));
    } else if (key.endsWith('_lte')) {
      const field = key.replace('_lte', '');
      items = items.filter(item => Number(item[field]) <= Number(val));
    } else {
      items = items.filter(item => String(item[key]).toLowerCase() === String(val).toLowerCase());
    }
  }

  // Sorting
  if (query._sort) {
    const sortField = query._sort;
    const order = query._order === 'desc' ? -1 : 1;
    items.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * order;
      if (a[sortField] > b[sortField]) return 1 * order;
      return 0;
    });
  }

  // Pagination
  const total = items.length;
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, parseInt(query.limit || '10', 10));
  const startIndex = (page - 1) * limit;
  const pagedItems = items.slice(startIndex, startIndex + limit);

  res.json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: pagedItems,
  });
});

// 4. Get by ID
router.get('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const items = db[collection] || [];
  const item = items.find(i => String(i.id) === String(id));

  if (!item) {
    return res.status(404).json({ error: 'Entity not found' });
  }
  res.json(item);
});

// 5. Create Entity (POST)
router.post('/:collection', (req: Request, res: Response) => {
  const { collection } = req.params;
  if (!db[collection]) db[collection] = [];

  const newEntity = {
    id: req.body.id || uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };

  db[collection].unshift(newEntity);
  res.status(201).json(newEntity);
});

// 6. Full Update (PUT)
router.put('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const items = db[collection] || [];
  const index = items.findIndex(i => String(i.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const updatedEntity = {
    id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  db[collection][index] = updatedEntity;
  res.json(updatedEntity);
});

// 7. Partial Update (PATCH)
router.patch('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const items = db[collection] || [];
  const index = items.findIndex(i => String(i.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  db[collection][index] = {
    ...db[collection][index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(db[collection][index]);
});

// 8. Delete Entity (DELETE)
router.delete('/:collection/:id', (req: Request, res: Response) => {
  const { collection, id } = req.params;
  const items = db[collection] || [];
  const index = items.findIndex(i => String(i.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const deleted = items.splice(index, 1)[0];
  res.json({ message: 'Deleted successfully', entity: deleted });
});

export default router;
