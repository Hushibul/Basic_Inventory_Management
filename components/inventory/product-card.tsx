import { Pressable, Text, View, Image } from 'react-native';

import type { Product } from '@/types/product';

type Props = {
  product: Product;
  onPress: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductCard({ product, onPress, onDelete }: Props) {
  const hasImage = product.imageUri.trim().length > 0;
  const isOutOfStock = product.stock <= 0;

  return (
    <Pressable
      className="mb-5 w-[48%] overflow-hidden rounded-[28px] border border-[#F3D8BF] bg-surface"
      onPress={() => onPress(product)}>
      <View className="relative aspect-[4/4.1] items-center justify-center bg-peach">
        {hasImage ? (
          <Image className="h-full w-full" resizeMode="cover" source={{ uri: product.imageUri }} />
        ) : (
          <Text className="px-4 text-center text-sm text-slate">No image</Text>
        )}
        <View className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1">
          <Text className={`text-[11px] font-semibold uppercase tracking-wide ${isOutOfStock ? 'text-danger' : 'text-tomato'}`}>
            {isOutOfStock ? 'Out of stock' : 'Ready stock'}
          </Text>
        </View>
      </View>
      <View className="px-4 pb-4 pt-3">
        <Text className="text-base font-semibold text-charcoal" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="mt-1 text-xs text-slate" numberOfLines={1}>
          {product.supplier}
        </Text>

        <View className="mt-3 flex-row flex-wrap">
          <View className={`mr-2 rounded-full px-3 py-1 ${isOutOfStock ? 'bg-[#FFF0F0]' : 'bg-[#FFF1E6]'}`}>
            <Text className={`text-[11px] font-semibold ${isOutOfStock ? 'text-danger' : 'text-tomato'}`}>
              {isOutOfStock ? 'Out of stock' : `Stock ${product.stock}`}
            </Text>
          </View>
          <View className="rounded-full bg-[#EEF6DA] px-3 py-1">
            <Text className="text-[11px] font-semibold text-olive">Sold {product.numberOfSold}</Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] uppercase tracking-wide text-slate">Offer</Text>
            <Text className="mt-1 text-sm font-semibold text-charcoal">${product.offerPrice.toFixed(2)}</Text>
          </View>
          <Pressable className="rounded-full bg-[#FFF0F0] px-3 py-2" onPress={() => onDelete(product)}>
            <Text className="text-center text-xs font-semibold text-danger">Delete</Text>
          </Pressable>
        </View>
      </View>
      <View className="border-t border-[#F3D8BF] bg-white px-4 py-3">
        <Text className="text-center text-xs font-semibold uppercase tracking-[1px] text-charcoal">Open details</Text>
      </View>
    </Pressable>
  );
}
