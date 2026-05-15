import * as FileSystem from 'expo-file-system/legacy';

import type { Product } from '@/types/product';

const EXPORTS_DIR = `${FileSystem.documentDirectory}product-exports/`;

export type ExportedCsvFile = {
  fileName: string;
  fileUri: string;
  size: number;
  modifiedAt: number | null;
};

function escapeCsvValue(value: string | number) {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatTimestampPart(value: number) {
  return String(value).padStart(2, '0');
}

function buildExportFileName(now: Date) {
  const year = now.getFullYear();
  const month = formatTimestampPart(now.getMonth() + 1);
  const day = formatTimestampPart(now.getDate());
  const hours = formatTimestampPart(now.getHours());
  const minutes = formatTimestampPart(now.getMinutes());
  const seconds = formatTimestampPart(now.getSeconds());

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.csv`;
}

function buildProductsCsv(products: Product[]) {
  const header = [
    'id',
    'name',
    'stock',
    'numberOfSold',
    'buyingPrice',
    'expectedSellingPrice',
    'offerPrice',
    'supplier',
    'imageUri',
    'createdAt',
    'updatedAt',
  ];

  const rows = products.map((product) =>
    [
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
      product.updatedAt,
    ]
      .map(escapeCsvValue)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

async function ensureExportsDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory unavailable on this device.');
  }

  const info = await FileSystem.getInfoAsync(EXPORTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(EXPORTS_DIR, { intermediates: true });
  }

  return EXPORTS_DIR;
}

export async function exportProductsAsCsv(products: Product[]) {
  const now = new Date();
  const fileName = buildExportFileName(now);
  const csvContent = buildProductsCsv(products);
  const directory = await ensureExportsDirectory();
  const fileUri = `${directory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { fileName, fileUri };
}

export async function listExportedCsvFiles() {
  const directory = await ensureExportsDirectory();
  const fileNames = await FileSystem.readDirectoryAsync(directory);

  const files = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith('.csv'))
      .map(async (fileName) => {
        const fileUri = `${directory}${fileName}`;
        const info = await FileSystem.getInfoAsync(fileUri);

        return {
          fileName,
          fileUri,
          size: info.exists && typeof info.size === 'number' ? info.size : 0,
          modifiedAt:
            info.exists && typeof info.modificationTime === 'number'
              ? info.modificationTime * 1000
              : null,
        } satisfies ExportedCsvFile;
      })
  );

  return files.sort((left, right) => (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0));
}

export async function readExportedCsvFile(fileUri: string) {
  return FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function renameExportedCsvFile(fileUri: string, nextBaseName: string) {
  const directory = await ensureExportsDirectory();
  const trimmedName = nextBaseName.trim().replace(/[/\\:*?"<>|]/g, '-');

  if (!trimmedName) {
    throw new Error('File name cannot be empty.');
  }

  const nextFileName = trimmedName.endsWith('.csv') ? trimmedName : `${trimmedName}.csv`;
  const nextFileUri = `${directory}${nextFileName}`;

  if (nextFileUri === fileUri) {
    return { fileName: nextFileName, fileUri: nextFileUri };
  }

  const existingInfo = await FileSystem.getInfoAsync(nextFileUri);
  if (existingInfo.exists) {
    throw new Error('A CSV with this name already exists.');
  }

  await FileSystem.moveAsync({ from: fileUri, to: nextFileUri });

  return { fileName: nextFileName, fileUri: nextFileUri };
}
