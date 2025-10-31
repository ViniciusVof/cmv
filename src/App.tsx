import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FixedCost } from './pages/FixedCost';
import { VariableCost } from './pages/VariableCost';
import { Suppliers } from './pages/Suppliers';
import { Ingredients } from './pages/Ingredients';
import { BatchStockMovements } from './pages/BatchStockMovements';
import { StockReconciliation } from './pages/StockReconciliation';
import { ReconciliationReports } from './pages/ReconciliationReports';
import { Recipes } from './pages/Recipes';
import { PdvProducts } from './pages/PdvProducts';
import { ProductCategories } from './pages/ProductCategories';
import { DeliveryAreas } from './pages/DeliveryAreas';
import { DeliveryDrivers } from './pages/DeliveryDrivers';
import { PaymentMethods } from './pages/PaymentMethods';
import { Customers } from './pages/Customers';
import { Orders } from './pages/Orders';
import { CashRegister } from './pages/CashRegister';
import { BusinessSettings } from './pages/BusinessSettings';
import { GlobalCMV } from './pages/GlobalCMV';
import { AccountPayables } from './pages/AccountPayables';
import { AccountReceivables } from './pages/AccountReceivables';
import { Categories } from './pages/Categories';
import { DRE } from './pages/DRE';
import { DRECategoryMapping } from './pages/DRECategoryMapping';
import { DRESettings } from './pages/DRESettings';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/custo-fixo"
          element={
            <ProtectedRoute>
              <FixedCost />
            </ProtectedRoute>
          }
        />
        <Route
          path="/custo-variavel"
          element={
            <ProtectedRoute>
              <VariableCost />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fornecedores"
          element={
            <ProtectedRoute>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estoque"
          element={
            <ProtectedRoute>
              <Ingredients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estoque/movimentacoes-lote"
          element={
            <ProtectedRoute>
              <BatchStockMovements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estoque/conciliacao"
          element={
            <ProtectedRoute>
              <StockReconciliation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estoque/relatorios-conciliacao"
          element={
            <ProtectedRoute>
              <ReconciliationReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fichas-tecnicas"
          element={
            <ProtectedRoute>
              <Recipes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/caixa"
          element={
            <ProtectedRoute>
              <CashRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/produtos"
          element={
            <ProtectedRoute>
              <PdvProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/categorias"
          element={
            <ProtectedRoute>
              <ProductCategories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/clientes"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/areas-entrega"
          element={
            <ProtectedRoute>
              <DeliveryAreas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/entregadores"
          element={
            <ProtectedRoute>
              <DeliveryDrivers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv/formas-pagamento"
          element={
            <ProtectedRoute>
              <PaymentMethods />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute>
              <BusinessSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cmv-global"
          element={
            <ProtectedRoute>
              <GlobalCMV />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/contas-a-pagar"
          element={
            <ProtectedRoute>
              <AccountPayables />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/contas-a-receber"
          element={
            <ProtectedRoute>
              <AccountReceivables />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/categorias"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/dre"
          element={
            <ProtectedRoute>
              <DRE />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/conciliacao-categorias"
          element={
            <ProtectedRoute>
              <DRECategoryMapping />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/configuracoes-dre"
          element={
            <ProtectedRoute>
              <DRESettings />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

