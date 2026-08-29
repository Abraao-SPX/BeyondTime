import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import FaceCaptureScreen from './src/screens/FaceCaptureScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <FaceCaptureScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

