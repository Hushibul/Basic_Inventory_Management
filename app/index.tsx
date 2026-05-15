import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/inventory/product-card';
import { deleteProductById, listProducts } from '@/lib/database';
import { deleteImageFromAppStorage } from '@/lib/image-store';
import { exportProductsAsCsv } from '@/lib/product-export';
import type { Product } from '@/types/product';

const SORT_OPTIONS = [
  { key: 'last_modified', label: 'Last modified' },
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'name_desc', label: 'Name Z-A' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['key'];

export default function HomeScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('last_modified');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleDelete = useCallback(
    (product: Product) => {
      Alert.alert('Delete product', `Delete "${product.name}" and remove stored image?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProductById(product.id);
            await deleteImageFromAppStorage(product.imageUri);
            await loadProducts();
          },
        },
      ]);
    },
    [loadProducts]
  );

  const handleExportCsv = useCallback(async () => {
    if (!products.length || exporting) {
      return;
    }

    setExporting(true);

    try {
      const { fileName, fileUri } = await exportProductsAsCsv(products);
      Alert.alert('CSV exported', `Saved ${fileName}${fileUri ? `\n${fileUri}` : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export CSV.';
      Alert.alert('Export failed', message);
    } finally {
      setExporting(false);
    }
  }, [exporting, products]);

  const sortedProducts = useMemo(() => {
    const nextProducts = [...products];

    nextProducts.sort((left, right) => {
      if (sortBy === 'name_asc') {
        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
      }

      if (sortBy === 'name_desc') {
        return right.name.localeCompare(left.name, undefined, { sensitivity: 'base' });
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });

    return nextProducts;
  }, [products, sortBy]);

  const selectedSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? 'Last modified',
    [sortBy]
  );

  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + product.stock, 0),
    [products]
  );

  const totalSold = useMemo(
    () => products.reduce((sum, product) => sum + product.numberOfSold, 0),
    [products]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-5 pb-5 pt-4">
        <View className="rounded-[30px] border border-[#F3D8BF] bg-white px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-slate">Quick actions</Text>
            <Text className="text-xs text-slate">Organize, export, review</Text>
          </View>

          <View className="mt-4 flex-row items-end">
            <View className="mr-3 flex-1">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-slate">Sort by</Text>
              <Pressable
                className="flex-row items-center justify-between rounded-[22px] border border-[#F3D8BF] bg-surface px-4 py-3"
                onPress={() => setSortMenuOpen((current) => !current)}>
                <Text className="text-sm font-semibold text-charcoal">{selectedSortLabel}</Text>
                <Feather color="#1F2937" name={sortMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} />
              </Pressable>
              {sortMenuOpen ? (
                <View className="mt-2 overflow-hidden rounded-[22px] border border-[#F3D8BF] bg-surface">
                  {SORT_OPTIONS.map((option, index) => {
                    const selected = option.key === sortBy;

                    return (
                      <Pressable
                        key={option.key}
                        className={`px-4 py-3 ${index < SORT_OPTIONS.length - 1 ? 'border-b border-[#F3D8BF]' : ''}`}
                        onPress={() => {
                          setSortBy(option.key);
                          setSortMenuOpen(false);
                        }}>
                        <Text className={selected ? 'font-semibold text-tomato' : 'text-charcoal'}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <Pressable
              className="mr-3 h-12 flex-row items-center rounded-[22px] border border-[#F3D8BF] bg-surface px-4"
              onPress={() => router.push('/exports')}>
              <Feather color="#1F2937" name="grid" size={16} />
              <Text className="ml-2 font-semibold text-charcoal">Exports</Text>
            </Pressable>

            <Pressable
              className={`h-12 flex-row items-center rounded-[22px] px-4 ${products.length ? 'bg-tomato' : 'bg-mist'}`}
              disabled={!products.length || exporting}
              onPress={handleExportCsv}>
              <Feather color="#FFFFFF" name="download" size={16} />
              <Text className="ml-2 font-semibold text-white">{exporting ? 'Saving...' : 'CSV'}</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-5 flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#F05A28" />
            </View>
          ) : (
            <FlatList
              data={sortedProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24, flexGrow: sortedProducts.length ? 0 : 1 }}
              ListHeaderComponent={
                <>
                  <View className="mb-5 overflow-hidden rounded-[34px] bg-charcoal px-5 pb-5 pt-5">
                    <View className="absolute right-0 top-0 h-28 w-28 rounded-full bg-tomato/25" />
                    <View className="absolute -bottom-5 right-10 h-24 w-24 rounded-full bg-butter/25" />
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-[13px] font-semibold uppercase tracking-[2px] text-peach">Daily dashboard</Text>
                        <Text className="mt-2 text-3xl font-bold leading-9 text-white">Fresh inventory, quicker checkout.</Text>
                        <Text className="mt-3 text-sm leading-6 text-[#FDE7D3]">
                          Food-delivery inspired control room for stock, sales, and exports.
                        </Text>
                      </View>
                      <Pressable
                        className="rounded-full bg-tomato px-4 py-3"
                        onPress={() => router.push('/product')}>
                        <Text className="font-semibold text-white">Add item</Text>
                      </Pressable>
                    </View>

                    <View className="mt-5 flex-row">
                      <View className="mr-3 flex-1 rounded-[24px] bg-white/10 px-4 py-4">
                        <Text className="text-xs uppercase tracking-[1.5px] text-[#FADCC0]">Products</Text>
                        <Text className="mt-2 text-2xl font-bold text-white">{products.length}</Text>
                      </View>
                      <View className="mr-3 flex-1 rounded-[24px] bg-white/10 px-4 py-4">
                        <Text className="text-xs uppercase tracking-[1.5px] text-[#FADCC0]">Stock units</Text>
                        <Text className="mt-2 text-2xl font-bold text-white">{totalStock}</Text>
                      </View>
                      <View className="flex-1 rounded-[24px] bg-white/10 px-4 py-4">
                        <Text className="text-xs uppercase tracking-[1.5px] text-[#FADCC0]">Sold units</Text>
                        <Text className="mt-2 text-2xl font-bold text-white">{totalSold}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="mb-4 flex-row items-end justify-between">
                    <View>
                      <Text className="text-2xl font-bold text-charcoal">Popular items</Text>
                      <Text className="mt-1 text-sm text-slate">Tap card to update pricing, stock, and supplier.</Text>
                    </View>
                  </View>
                </>
              }
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onDelete={handleDelete}
                  onPress={(product) => router.push(`/product?id=${product.id}`)}
                />
              )}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center rounded-[30px] border border-dashed border-[#F3D8BF] bg-white px-8 py-12">
                  <Text className="text-lg font-semibold text-charcoal">No menu items yet</Text>
                  <Text className="mt-2 text-center text-sm leading-6 text-slate">
                    Start with first product photo and pricing. Home list will fill like delivery feed.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
