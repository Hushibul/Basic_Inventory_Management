import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = `${FileSystem.documentDirectory}product-images/`;

export async function ensureImageDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory unavailable on this device.');
  }

  const info = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }

  return IMAGES_DIR;
}

export async function moveImageToAppStorage(sourceUri: string) {
  const directory = await ensureImageDirectory();
  const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const destinationUri = `${directory}${fileName}`;
  const canMove = sourceUri.startsWith('file://');

  if (canMove) {
    try {
      await FileSystem.moveAsync({ from: sourceUri, to: destinationUri });
      return destinationUri;
    } catch {
      // Some gallery providers expose read-only file handles. Fall back to copy.
    }
  }

  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}

export async function deleteImageFromAppStorage(uri?: string | null) {
  if (!uri) {
    return;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
