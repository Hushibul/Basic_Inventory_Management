import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

  const handleDelete = useCallback((product: Product) => {
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
  }, [loadProducts]);

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

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 px-5 pb-5 pt-4">
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-bold text-ink">Inventory</Text>
            <Text className="mt-1 text-sm text-slate">
              Scan fast. Tap card to edit stock pricing and supplier data.
            </Text>
          </View>
          <Pressable
            className="rounded-2xl bg-brand px-4 py-3"
            onPress={() => router.push('/product')}>
            <Text className="font-semibold text-white">Add product</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row items-end">
          <View className="mr-3 flex-1">
            <Text className="mb-2 text-sm font-medium text-slate">Sort by</Text>
            <Pressable
              className="rounded-2xl border border-mist bg-white px-4 py-3"
              onPress={() => setSortMenuOpen((current) => !current)}>
              <Text className="text-base text-ink">{selectedSortLabel}</Text>
            </Pressable>
            {sortMenuOpen ? (
              <View className="mt-2 overflow-hidden rounded-2xl border border-mist bg-white">
                {SORT_OPTIONS.map((option, index) => {
                  const selected = option.key === sortBy;

                  return (
                    <Pressable
                      key={option.key}
                      className={`px-4 py-3 ${index < SORT_OPTIONS.length - 1 ? 'border-b border-mist' : ''}`}
                      onPress={() => {
                        setSortBy(option.key);
                        setSortMenuOpen(false);
                      }}>
                      <Text className={selected ? 'font-semibold text-brand' : 'text-ink'}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <Pressable
            className="mr-3 rounded-2xl border border-mist bg-white px-4 py-3"
            onPress={() => router.push('/exports')}>
            <Text className="font-semibold text-ink">Exports</Text>
          </Pressable>

          <Pressable
            className={`rounded-2xl px-4 py-3 ${products.length ? 'bg-ink' : 'bg-mist'}`}
            disabled={!products.length || exporting}
            onPress={handleExportCsv}>
            <Text className="font-semibold text-white">{exporting ? 'Exporting...' : 'Export CSV'}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0F766E" />
          </View>
        ) : (
          <FlatList
            data={sortedProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={{ paddingBottom: 24, flexGrow: sortedProducts.length ? 0 : 1 }}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onDelete={handleDelete}
                onPress={(product) => router.push(`/product?id=${product.id}`)}
              />
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-mist bg-white px-8 py-12">
                <Text className="text-lg font-semibold text-ink">No products yet</Text>
                <Text className="mt-2 text-center text-sm text-slate">
                  Add first item with photo, pricing, supplier details.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
