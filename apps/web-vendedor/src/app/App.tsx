import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { CustomersScreen } from '../features/customers/CustomersScreen';
import { OrdersScreen } from '../features/orders/OrdersScreen';
import { AppShell } from './AppShell';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/painel" element={<DashboardScreen />} />
          <Route path="/clientes" element={<CustomersScreen />} />
          <Route path="/pedidos" element={<OrdersScreen />} />
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
