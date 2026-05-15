import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImagePickerField } from '@/components/inventory/image-picker-field';
import { deleteProductById, getProductById, saveProduct } from '@/lib/database';
import { deleteImageFromAppStorage } from '@/lib/image-store';
import type { Product, ProductFormValues } from '@/types/product';

const emptyValues: ProductFormValues = {
  name: '',
  stock: '',
  numberOfSold: '0',
  buyingPrice: '',
  expectedSellingPrice: '',
  offerPrice: '',
  supplier: '',
  imageUri: '',
};

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ label, error, children }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-slate">{label}</Text>
      {children}
      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}

function Input(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className="rounded-[22px] border border-[#F3D8BF] bg-surface px-4 py-3.5 text-base text-charcoal"
      placeholderTextColor="#64748B"
      {...props}
    />
  );
}

export default function ProductScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : undefined;
  const isEditing = !!productId;
  const [loading, setLoading] = useState(isEditing);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: emptyValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit product' : 'Add product' });
  }, [isEditing, navigation]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      reset(emptyValues);
      return;
    }

    let mounted = true;

    getProductById(productId)
      .then((product) => {
        if (!mounted) {
          return;
        }

        if (!product) {
          Alert.alert('Missing product', 'This product record no longer exists.');
          router.back();
          return;
        }

        setCurrentProduct(product);
        reset({
          name: product.name,
          stock: String(product.stock),
          numberOfSold: String(product.numberOfSold),
          buyingPrice: String(product.buyingPrice),
          expectedSellingPrice: String(product.expectedSellingPrice),
          offerPrice: String(product.offerPrice),
          supplier: product.supplier,
          imageUri: product.imageUri,
        });
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [productId, reset, router]);

  const submitLabel = useMemo(() => (isEditing ? 'Save changes' : 'Create product'), [isEditing]);

  const onSubmit = handleSubmit(async (values) => {
    const now = new Date().toISOString();
    const nextProduct: Product = {
      id: currentProduct?.id ?? `${Date.now()}`,
      name: values.name.trim(),
      stock: Number(values.stock),
      numberOfSold: Number(values.numberOfSold),
      buyingPrice: Number(values.buyingPrice),
      expectedSellingPrice: Number(values.expectedSellingPrice),
      offerPrice: Number(values.offerPrice),
      supplier: values.supplier.trim(),
      imageUri: values.imageUri,
      createdAt: currentProduct?.createdAt ?? now,
      updatedAt: now,
    };

    if (currentProduct?.imageUri && currentProduct.imageUri !== values.imageUri) {
      await deleteImageFromAppStorage(currentProduct.imageUri);
    }

    await saveProduct(nextProduct);
    router.back();
  });

  const handleDelete = async () => {
    if (!currentProduct) {
      return;
    }

    Alert.alert('Delete product', 'Remove product and stored image from device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProductById(currentProduct.id);
          await deleteImageFromAppStorage(currentProduct.imageUri);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#0F766E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <View className="mb-5 overflow-hidden rounded-[30px] bg-charcoal px-5 pb-5 pt-5">
            <View className="absolute right-0 top-0 h-28 w-28 rounded-full bg-tomato/20" />
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-peach">
              {isEditing ? 'Edit listing' : 'New listing'}
            </Text>
            <Text className="mt-2 text-3xl font-bold text-white">
              {isEditing ? 'Refresh product details.' : 'Add next best seller.'}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-[#FDE7D3]">
              Keep stock, sold count, pricing, supplier, and photo in one polished card.
            </Text>
          </View>

          <View className="rounded-[30px] border border-[#F3D8BF] bg-white px-4 py-4">
          <Controller
            control={control}
            name="imageUri"
            rules={{ required: 'Product image required.' }}
            render={({ field: { onChange, value } }) => (
              <View className="mb-6">
                <ImagePickerField imageUri={value} onChange={(nextValue) => onChange(nextValue)} />
                {errors.imageUri ? <Text className="mt-2 text-sm text-danger">{errors.imageUri.message}</Text> : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="name"
            rules={{ required: 'Name required.' }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Product name" error={errors.name?.message}>
                <Input placeholder="Wireless scanner" onBlur={onBlur} onChangeText={(text) => onChange(text)} value={value} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="stock"
            rules={{
              required: 'Stock required.',
              validate: (value) => {
                if (!value.trim()) {
                  return 'Stock required.';
                }
                return (!Number.isNaN(Number(value)) && Number(value) >= 0) || 'Enter valid number.';
              },
            }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Stock" error={errors.stock?.message}>
                <Input
                  keyboardType="number-pad"
                  placeholder="0"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="numberOfSold"
            rules={{
              required: 'Number of sold required.',
              validate: (value) => {
                if (!value.trim()) {
                  return 'Number of sold required.';
                }
                return (!Number.isNaN(Number(value)) && Number(value) >= 0) || 'Enter valid number.';
              },
            }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Number of sold" error={errors.numberOfSold?.message}>
                <Input
                  keyboardType="number-pad"
                  placeholder="0"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="supplier"
            rules={{ required: 'Supplier required.' }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Supplier" error={errors.supplier?.message}>
                <Input placeholder="Northwind Traders" onBlur={onBlur} onChangeText={(text) => onChange(text)} value={value} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="buyingPrice"
            rules={{
              required: 'Buying price required.',
              validate: (value) => {
                if (!value.trim()) {
                  return 'Buying price required.';
                }
                return (!Number.isNaN(Number(value)) && Number(value) >= 0) || 'Enter valid number.';
              },
            }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Buying price" error={errors.buyingPrice?.message}>
                <Input
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="expectedSellingPrice"
            rules={{
              required: 'Expected selling price required.',
              validate: (value) => {
                if (!value.trim()) {
                  return 'Expected selling price required.';
                }
                return (!Number.isNaN(Number(value)) && Number(value) >= 0) || 'Enter valid number.';
              },
            }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Expected selling price" error={errors.expectedSellingPrice?.message}>
                <Input
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="offerPrice"
            rules={{
              required: 'Offer price required.',
              validate: (value) => {
                if (!value.trim()) {
                  return 'Offer price required.';
                }
                return (!Number.isNaN(Number(value)) && Number(value) >= 0) || 'Enter valid number.';
              },
            }}
            render={({ field: { onBlur, onChange, value } }) => (
              <Field label="Offer price" error={errors.offerPrice?.message}>
                <Input
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                />
              </Field>
            )}
          />

          {currentProduct ? (
            <View className="mb-6 rounded-[24px] border border-[#F3D8BF] bg-surface px-4 py-4">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-slate">Audit trail</Text>
              <Text className="mt-2 text-sm text-charcoal">Created: {new Date(currentProduct.createdAt).toLocaleString()}</Text>
              <Text className="mt-1 text-sm text-charcoal">Updated: {new Date(currentProduct.updatedAt).toLocaleString()}</Text>
            </View>
          ) : null}

          <Pressable className="rounded-[24px] bg-tomato px-4 py-4" disabled={isSubmitting} onPress={onSubmit}>
            <Text className="text-center text-base font-semibold text-white">
              {isSubmitting ? 'Saving...' : submitLabel}
            </Text>
          </Pressable>

          {currentProduct ? (
            <Pressable className="mt-3 rounded-[24px] border border-[#FFD3D3] bg-[#FFF4F4] px-4 py-4" onPress={handleDelete}>
              <Text className="text-center text-base font-semibold text-danger">Delete product</Text>
            </Pressable>
          ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
