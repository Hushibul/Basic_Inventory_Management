import { Pressable, Text, View, Image } from 'react-native';

import type { Product } from '@/types/product';

type Props = {
  product: Product;
  onPress: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductCard({ product, onPress, onDelete }: Props) {
  const hasImage = product.imageUri.trim().length > 0;

  return (
    <Pressable
      className="mb-4 w-[48%] overflow-hidden rounded-3xl border border-mist bg-white"
      onPress={() => onPress(product)}>
      <View className="aspect-[4/3] items-center justify-center bg-canvas">
        {hasImage ? (
          <Image className="h-full w-full" resizeMode="cover" source={{ uri: product.imageUri }} />
        ) : (
          <Text className="px-4 text-center text-sm text-slate">No image</Text>
        )}
      </View>
      <View className="px-4 py-3">
        <Text className="text-base font-semibold text-ink" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="mt-1 text-xs text-slate">{product.supplier}</Text>
        <Text className="mt-1 text-xs font-semibold text-brand">Stock: {product.stock}</Text>
        <Text className="mt-1 text-xs text-slate">Sold: {product.numberOfSold}</Text>
        <Pressable className="mt-3 rounded-2xl bg-red-50 px-3 py-2" onPress={() => onDelete(product)}>
          <Text className="text-center text-xs font-semibold text-danger">Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
