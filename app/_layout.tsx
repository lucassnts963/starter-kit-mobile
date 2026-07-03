import React from 'react';
import { Stack } from 'expo-router';
import { ServicesProvider } from '../src/expo/services-context';

export default function RootLayout() {
  return (
    <ServicesProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Escriba' }} />
        <Stack.Screen name="new-meeting" options={{ title: 'Nova reunião' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Sessão', headerBackVisible: false }} />
        <Stack.Screen name="results/[id]" options={{ title: 'Resultados' }} />
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      </Stack>
    </ServicesProvider>
  );
}
