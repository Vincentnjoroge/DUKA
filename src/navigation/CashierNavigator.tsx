import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../constants';

// Screens
import CashierDashboard from '../screens/cashier/CashierDashboard';
import OpenShiftScreen from '../screens/cashier/OpenShiftScreen';
import POSScreen from '../screens/cashier/POSScreen';
import PaymentScreen from '../screens/cashier/PaymentScreen';
import SaleCompleteScreen from '../screens/cashier/SaleCompleteScreen';
import ShiftSummaryScreen from '../screens/cashier/ShiftSummaryScreen';
import CloseShiftScreen from '../screens/cashier/CloseShiftScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CashierTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarLabel: 'Sell',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{'🛒'}</Text>,
        }}
      />
      <Tab.Screen
        name="ShiftSummary"
        component={ShiftSummaryScreen}
        options={{
          tabBarLabel: 'Summary',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{'📊'}</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function CashierNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="CashierDashboard"
        component={CashierDashboard}
        options={{ title: 'DUKA POS' }}
      />
      <Stack.Screen
        name="OpenShift"
        component={OpenShiftScreen}
        options={{ title: 'Start Your Shift' }}
      />
      <Stack.Screen
        name="CashierTabs"
        component={CashierTabs}
        options={{ title: 'DUKA POS', headerLeft: () => null }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment', presentation: 'modal' }}
      />
      <Stack.Screen
        name="SaleComplete"
        component={SaleCompleteScreen}
        options={{ title: 'Sale Complete', headerLeft: () => null }}
      />
      <Stack.Screen
        name="CloseShift"
        component={CloseShiftScreen}
        options={{ title: 'End Shift' }}
      />
    </Stack.Navigator>
  );
}
