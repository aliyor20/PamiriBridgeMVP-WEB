import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { PreferencesProvider } from './src/context/PreferencesContext';

export default function App() {
  return (
    <PreferencesProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PreferencesProvider>
  );
}
