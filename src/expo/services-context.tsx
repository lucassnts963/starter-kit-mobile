import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createContainer, type AppContainer } from './container';

const ServicesContext = createContext<AppContainer | null>(null);

/** Provider do composition root — telas consomem via useServices() (hooks finos). */
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<AppContainer | null>(null);

  useEffect(() => {
    let mounted = true;
    createContainer().then((c) => {
      if (mounted) setContainer(c);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (container === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return <ServicesContext.Provider value={container}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppContainer {
  const services = useContext(ServicesContext);
  if (services === null) throw new Error('useServices deve ser usado dentro de <ServicesProvider>');
  return services;
}
