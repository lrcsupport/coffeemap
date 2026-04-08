import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import MapScreen from './app/screens/MapScreen';
import ListScreen from './app/screens/ListScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import AddPlaceScreen from './app/screens/AddPlaceScreen';
import type { RootStackParamList } from './app/types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const tabScreenOptions = {
  headerStyle: {
    backgroundColor: '#1a1a1a',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: '#F5A623',
  headerTitleStyle: {
    fontWeight: '700' as const,
  },
  tabBarStyle: {
    backgroundColor: '#1a1a1a',
    borderTopColor: '#333',
    borderTopWidth: 1,
  },
  tabBarActiveTintColor: '#F5A623',
  tabBarInactiveTintColor: '#666',
};

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Deep link config: coffeemap://add?handle=USERNAME
const linking = {
  prefixes: [Linking.createURL('/'), 'coffeemap://'],
  config: {
    screens: {
      AddPlace: {
        path: 'add',
        parse: {
          handle: (handle: string) => handle,
        },
      },
      Main: '',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1a1a1a' },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddPlace"
          component={AddPlaceScreen}
          options={{
            presentation: 'modal',
            headerShown: true,
            headerStyle: { backgroundColor: '#1a1a1a' },
            headerTintColor: '#F5A623',
            headerTitle: 'Add Place',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
