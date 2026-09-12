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
import { DfeScreen } from '../features/inbound/DfeScreen';
import { BoletosScreen } from '../features/finance/BoletosScreen';
import { BranchConfigScreen } from '../features/config/BranchConfigScreen';
import { FiscalSettingsScreen } from '../features/fiscal/FiscalSettingsScreen';
import { AuditScreen } from '../features/audit/AuditScreen';
import { ModuloEmBreveScreen } from '../features/modules/ModuloEmBreveScreen';
import { AppShell } from './AppShell';
import { ROTAS } from './rotas';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROTAS.visaoGeral} element={<DashboardScreen />} />
          <Route path={ROTAS.estoque} element={<StockScreen />} />
          <Route path={ROTAS.inventarios} element={<InventoryScreen />} />
          <Route path={ROTAS.entradasXml} element={<DfeScreen />} />
          <Route path={ROTAS.inteligenciaDeEstoque} element={<StockIntelligenceScreen />} />
          <Route path={ROTAS.compras} element={<PurchasingScreen />} />
          <Route path={ROTAS.boletos} element={<BoletosScreen />} />
          <Route path={ROTAS.pdv} element={<PosScreen />} />
          <Route path={ROTAS.produtos} element={<ProductsScreen />} />
          <Route path={ROTAS.cargos} element={<RolesScreen />} />
          <Route path={ROTAS.filiais} element={<BranchConfigScreen />} />
          <Route path={ROTAS.integracoes} element={<PlatformScreen />} />
          <Route path={ROTAS.fiscal} element={<FiscalSettingsScreen />} />
          <Route path={ROTAS.historicoDeLogs} element={<AuditScreen />} />
          {/* Opcoes do menu que ainda nao tem tela: ver menu.data.ts. */}
          <Route path="/modulo/*" element={<ModuloEmBreveScreen />} />
          <Route path="*" element={<Navigate to={ROTAS.visaoGeral} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
