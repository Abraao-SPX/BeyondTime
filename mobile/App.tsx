import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

export default function App() {
  // Verificação e aplicação proativa de atualizações OTA (Over-The-Air) automáticas
  useEffect(() => {
    async function checkOtaUpdate() {
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('[UPDATES] Nova versão encontrada! Baixando...');
            await Updates.fetchUpdateAsync();
            console.log('[UPDATES] Reiniciando com a nova versão...');
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        console.log('[UPDATES] Verificação OTA:', e);
      }
    }
    checkOtaUpdate();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BeyondTime</Text>
      <Text style={styles.subtitle}>Ambiente Mobile com Atualização Automática</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
