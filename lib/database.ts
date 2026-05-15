import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Product } from '@/types/product';

const DATABASE_NAME = 'inventory.db';
let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDatabase() {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME);
  }

  return dbPromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      numberOfSold REAL NOT NULL DEFAULT 0,
      buyingPrice REAL NOT NULL,
      expectedSellingPrice REAL NOT NULL,
      offerPrice REAL NOT NULL,
      supplier TEXT NOT NULL,
      imageUri TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(products)');
  const hasStockColumn = columns.some((column) => column.name === 'stock');
  const hasNumberOfSoldColumn = columns.some((column) => column.name === 'numberOfSold');
  if (!hasStockColumn) {
    await db.execAsync('ALTER TABLE products ADD COLUMN stock REAL NOT NULL DEFAULT 0;');
  }
  if (!hasNumberOfSoldColumn) {
    await db.execAsync('ALTER TABLE products ADD COLUMN numberOfSold REAL NOT NULL DEFAULT 0;');
  }

  return db;
}

export async function listProducts() {
  const db = await initializeDatabase();
  return db.getAllAsync<Product>('SELECT * FROM products ORDER BY updatedAt DESC');
}

export async function getProductById(id: string) {
  const db = await initializeDatabase();
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', id);
}

export async function saveProduct(product: Product) {
  const db = await initializeDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO products
      (id, name, stock, numberOfSold, buyingPrice, expectedSellingPrice, offerPrice, supplier, imageUri, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    product.id,
    product.name,
    product.stock,
    product.numberOfSold,
    product.buyingPrice,
    product.expectedSellingPrice,
    product.offerPrice,
    product.supplier,
    product.imageUri,
    product.createdAt,
    product.updatedAt
  );
}

export async function deleteProductById(id: string) {
  const db = await initializeDatabase();
  return db.runAsync('DELETE FROM products WHERE id = ?', id);
}
