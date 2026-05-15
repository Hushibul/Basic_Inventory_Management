import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import '@/global.css';

import { initializeDatabase } from '@/lib/database';

export default function RootLayout() {
  useEffect(() => {
    initializeDatabase().catch((error) => {
      console.error('Database init failed', error);
    });
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerTintColor: '#0F172A',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}>
        <Stack.Screen name="index" options={{ title: 'Inventory' }} />
        <Stack.Screen name="exports" options={{ title: 'CSV exports' }} />
        <Stack.Screen name="product" options={{ title: 'Product details' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
