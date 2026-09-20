import { Router, Request, Response } from 'express';
import { faker } from '@faker-js/faker';

const router = Router();

// Realistic User Generator
function generateUser() {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    fullName: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    avatar: faker.image.avatar(),
    phone: faker.phone.number(),
    jobTitle: faker.person.jobTitle(),
    department: faker.commerce.department(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
      coordinates: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
    },
    company: {
      name: faker.company.name(),
      catchPhrase: faker.company.catchPhrase(),
      bs: faker.company.buzzPhrase(),
    },
    createdAt: faker.date.past().toISOString(),
  };
}

// Realistic Product Generator
function generateProduct() {
  return {
    id: faker.string.uuid(),
    sku: faker.string.alphanumeric(8).toUpperCase(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price({ min: 10, max: 999, dec: 2 })),
    currency: 'USD',
    category: faker.commerce.department(),
    rating: parseFloat((faker.number.float({ min: 1, max: 5, multipleOf: 0.1 })).toFixed(1)),
    reviewsCount: faker.number.int({ min: 0, max: 500 }),
    inStock: faker.datatype.boolean(),
    stockQuantity: faker.number.int({ min: 0, max: 100 }),
    images: [
      faker.image.urlLoremFlickr({ category: 'fashion' }),
      faker.image.urlLoremFlickr({ category: 'technics' }),
    ],
  };
}

// Realistic Financial Record
function generateFinance() {
  return {
    id: faker.string.uuid(),
    accountNumber: faker.finance.accountNumber(10),
    accountName: faker.finance.accountName(),
    amount: parseFloat(faker.finance.amount({ min: 5, max: 5000, dec: 2 })),
    currency: faker.finance.currencyCode(),
    transactionType: faker.helpers.arrayElement(['deposit', 'withdrawal', 'transfer', 'payment']),
    creditCard: {
      number: faker.finance.creditCardNumber({ issuer: '4485-####-####-####' }), // Masked Visa
      issuer: faker.finance.creditCardIssuer(),
      cvv: faker.finance.creditCardCVV(),
    },
    iban: faker.finance.iban(),
    bic: faker.finance.bic(),
    bitcoinAddress: faker.finance.bitcoinAddress(),
    ethereumAddress: faker.finance.ethereumAddress(),
    date: faker.date.recent().toISOString(),
  };
}

// Routes
router.get('/users', (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.query.count as string, 10) || 10, 1), 100);
  const seed = req.query.seed ? parseInt(req.query.seed as string, 10) : undefined;
  if (seed !== undefined) faker.seed(seed);

  const users = Array.from({ length: count }, () => generateUser());
  res.json({
    total: count,
    seed: seed ?? null,
    data: users,
  });
});

router.get('/users/:id', (req: Request, res: Response) => {
  const user = generateUser();
  user.id = req.params.id;
  res.json(user);
});

router.get('/products', (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.query.count as string, 10) || 10, 1), 100);
  const products = Array.from({ length: count }, () => generateProduct());
  res.json({
    total: count,
    data: products,
  });
});

router.get('/finance', (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.query.count as string, 10) || 10, 1), 100);
  const records = Array.from({ length: count }, () => generateFinance());
  res.json({
    total: count,
    data: records,
  });
});

// Dynamic schema generator
router.post('/custom', (req: Request, res: Response) => {
  const schema = req.body.schema || {
    id: 'string.uuid',
    name: 'person.fullName',
    email: 'internet.email',
    city: 'location.city',
  };
  const count = Math.min(Math.max(parseInt(req.query.count as string, 10) || 5, 1), 50);

  function resolveFakerPath(path: string): any {
    const parts = path.split('.');
    let current: any = faker;
    for (const part of parts) {
      if (current && typeof current[part] !== 'undefined') {
        current = current[part];
      } else {
        return `[Invalid faker path: ${path}]`;
      }
    }
    return typeof current === 'function' ? current() : current;
  }

  function generateFromSchema(s: Record<string, any>): any {
    const obj: Record<string, any> = {};
    for (const [key, val] of Object.entries(s)) {
      if (typeof val === 'string') {
        obj[key] = resolveFakerPath(val);
      } else if (typeof val === 'object' && val !== null) {
        obj[key] = generateFromSchema(val);
      } else {
        obj[key] = val;
      }
    }
    return obj;
  }

  const items = Array.from({ length: count }, () => generateFromSchema(schema));
  res.json({
    count,
    schema,
    data: items,
  });
});

export default router;
