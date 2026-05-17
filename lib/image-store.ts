import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = `${FileSystem.documentDirectory}product-images/`;

type StoreImageOptions = {
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

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

function extensionFromImage(sourceUri: string, options: StoreImageOptions) {
  const mimeExtension = options.mimeType?.split('/')[1]?.split(';')[0];
  const nameExtension = options.fileName?.split('.').pop()?.split('?')[0];
  const uriExtension = sourceUri.startsWith('content://')
    ? undefined
    : sourceUri.split('.').pop()?.split('?')[0];
  const extension = (mimeExtension || nameExtension || uriExtension || 'jpg').toLowerCase();

  if (extension === 'jpeg') {
    return 'jpg';
  }

  return /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
}

export async function moveImageToAppStorage(sourceUri: string, options: StoreImageOptions = {}) {
  const directory = await ensureImageDirectory();
  const extension = extensionFromImage(sourceUri, options);
  const imageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fileName = `${imageId}.${extension}`;
  const destinationUri = `${directory}${fileName}`;

  // Try move first (only works for file:// URIs), fall back to copy.
  if (sourceUri.startsWith('file://')) {
    try {
      await FileSystem.moveAsync({ from: sourceUri, to: destinationUri });
      return destinationUri;
    } catch {
      // Some gallery providers expose read-only file handles. Fall back to copy.
    }
  }

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  } catch (error) {
    if (!options.base64) {
      throw error;
    }

    const base64DestinationUri = `${directory}${imageId}.jpg`;
    await FileSystem.writeAsStringAsync(base64DestinationUri, options.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64DestinationUri;
  }

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
