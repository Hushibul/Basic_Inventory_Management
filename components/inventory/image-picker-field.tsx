import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { moveImageToAppStorage } from '@/lib/image-store';

type Props = {
  imageUri: string;
  onChange: (nextUri: string) => void;
};

async function ensurePermission(
  getPermission: () => Promise<ImagePicker.CameraPermissionResponse | ImagePicker.MediaLibraryPermissionResponse>,
  requestPermission: () => Promise<ImagePicker.CameraPermissionResponse | ImagePicker.MediaLibraryPermissionResponse>,
  deniedMessage: string
) {
  const existingPermission = await getPermission();

  if (existingPermission.granted) {
    return true;
  }

  const permission = await requestPermission();

  if (!permission.granted) {
    Alert.alert('Permission needed', deniedMessage);
    return false;
  }

  return true;
}

export function ImagePickerField({ imageUri, onChange }: Props) {
  const handlePick = async (mode: 'camera' | 'gallery') => {
    try {
      const hasPermission =
        mode === 'camera'
          ? await ensurePermission(
              ImagePicker.getCameraPermissionsAsync,
              ImagePicker.requestCameraPermissionsAsync,
              'Camera permission required to capture product photos.'
            )
          : await ensurePermission(
              ImagePicker.getMediaLibraryPermissionsAsync,
              ImagePicker.requestMediaLibraryPermissionsAsync,
              'Media library permission required to select product photos.'
            );

      if (!hasPermission) {
        return;
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const storedUri = await moveImageToAppStorage(result.assets[0].uri);
      onChange(storedUri);
    } catch (error) {
      console.error('Image pick failed', error);
      Alert.alert('Image error', 'Could not save selected image. Try another photo.');
    }
  };

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-ink">Product image</Text>
      <View className="overflow-hidden rounded-3xl border border-dashed border-mist bg-white">
        <View className="aspect-[4/3] items-center justify-center bg-canvas">
          {imageUri ? (
            <Image className="h-full w-full" resizeMode="cover" source={{ uri: imageUri }} />
          ) : (
            <Text className="px-6 text-center text-sm text-slate">
              Add clean photo for faster scanning on inventory list.
            </Text>
          )}
        </View>
        <View className="flex-row gap-3 px-4 py-4">
          <Pressable className="flex-1 rounded-2xl bg-brand px-4 py-3" onPress={() => handlePick('camera')}>
            <Text className="text-center font-semibold text-white">Use camera</Text>
          </Pressable>
          <Pressable className="flex-1 rounded-2xl bg-ink px-4 py-3" onPress={() => handlePick('gallery')}>
            <Text className="text-center font-semibold text-white">Open gallery</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
