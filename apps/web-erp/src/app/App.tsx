import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { StockScreen } from '../features/inventory/StockScreen';
import { ProductsScreen } from '../features/products/ProductsScreen';
import { PosScreen } from '../features/pos/PosScreen';
import { InventoryScreen } from '../features/inventory/InventoryScreen';
import { RolesScreen } from '../features/roles/RolesScreen';
import { StockIntelligenceScreen } from '../features/stock-intelligence/StockIntelligenceScreen';
import { PurchasingScreen } from '../features/purchasing/PurchasingScreen';
import { PlatformScreen } from '../features/platform/PlatformScreen';
import { AppShell } from './AppShell';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/visao-geral" element={<DashboardScreen />} />
          <Route path="/estoque" element={<StockScreen />} />
          <Route path="/estoque/inventarios" element={<InventoryScreen />} />
          <Route path="/estoque/inteligencia" element={<StockIntelligenceScreen />} />
          <Route path="/compras" element={<PurchasingScreen />} />
          <Route path="/vendas/pdv" element={<PosScreen />} />
          <Route path="/cadastros/produtos" element={<ProductsScreen />} />
          <Route path="/configuracoes/cargos" element={<RolesScreen />} />
          <Route path="/configuracoes/integracoes" element={<PlatformScreen />} />
          <Route path="*" element={<Navigate to="/visao-geral" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
