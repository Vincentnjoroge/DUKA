import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../constants';

// Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import ShiftApprovalScreen from '../screens/admin/ShiftApprovalScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import ProductDetailScreen from '../screens/admin/ProductDetailScreen';
import AddProductScreen from '../screens/admin/AddProductScreen';
import CSVImportScreen from '../screens/admin/CSVImportScreen';
import StockAdjustmentScreen from '../screens/admin/StockAdjustmentScreen';
import SuppliersScreen from '../screens/admin/SuppliersScreen';
import PurchaseOrdersScreen from '../screens/admin/PurchaseOrdersScreen';
import CreatePOScreen from '../screens/admin/CreatePOScreen';
import ReceiveStockScreen from '../screens/admin/ReceiveStockScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import DailySalesReport from '../screens/admin/DailySalesReport';
import StockMovementReport from '../screens/admin/StockMovementReport';
import ProfitLossReport from '../screens/admin/ProfitLossReport';
import CashierPerformanceReport from '../screens/admin/CashierPerformanceReport';
import BusinessPerformanceReport from '../screens/admin/BusinessPerformanceReport';
import SettingsScreen from '../screens/admin/SettingsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import RefundScreen from '../screens/admin/RefundScreen';
import StuckPaymentsScreen from '../screens/admin/StuckPaymentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AdminTabs() {
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{'🏠'}</Text>,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{'📦'}</Text>,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={PurchaseOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{'🚚'}</Text>,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{'📈'}</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{'⚙️'}</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="AdminTabs"
        component={AdminTabs}
        options={{ title: 'DUKA Admin', headerShown: false }}
      />
      <Stack.Screen name="ShiftApproval" component={ShiftApprovalScreen} options={{ title: 'Shift Approval' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Add Product' }} />
      <Stack.Screen name="CSVImport" component={CSVImportScreen} options={{ title: 'Import Products' }} />
      <Stack.Screen name="StockAdjustment" component={StockAdjustmentScreen} options={{ title: 'Adjust Stock' }} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Suppliers' }} />
      <Stack.Screen name="CreatePO" component={CreatePOScreen} options={{ title: 'New Purchase Order' }} />
      <Stack.Screen name="ReceiveStock" component={ReceiveStockScreen} options={{ title: 'Receive Stock' }} />
      <Stack.Screen name="DailySalesReport" component={DailySalesReport} options={{ title: 'Daily Sales' }} />
      <Stack.Screen name="StockMovementReport" component={StockMovementReport} options={{ title: 'Stock Movements' }} />
      <Stack.Screen name="ProfitLossReport" component={ProfitLossReport} options={{ title: 'Profit & Loss' }} />
      <Stack.Screen name="CashierPerformanceReport" component={CashierPerformanceReport} options={{ title: 'Cashier Performance' }} />
      <Stack.Screen name="BusinessPerformanceReport" component={BusinessPerformanceReport} options={{ title: 'Business Performance' }} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Users' }} />
      <Stack.Screen name="Refund" component={RefundScreen} options={{ title: 'Process Refund' }} />
      <Stack.Screen name="StuckPayments" component={StuckPaymentsScreen} options={{ title: 'Stuck Payments' }} />
    </Stack.Navigator>
  );
}
