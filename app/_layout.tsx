import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { ServicesProvider } from '../src/expo/services-context';
import { colors } from '../src/components/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.foreground,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ServicesProvider>
      <Stack screenOptions={headerOptions}>
        <Stack.Screen name="index" options={{ title: 'Escriba' }} />
        <Stack.Screen name="new-meeting" options={{ title: 'Nova reunião' }} />
        <Stack.Screen name="import-audio" options={{ title: 'Importar áudio' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Sessão', headerBackVisible: false }} />
        <Stack.Screen name="results/[id]" options={{ title: 'Resultados' }} />
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      </Stack>
    </ServicesProvider>
  );
}
