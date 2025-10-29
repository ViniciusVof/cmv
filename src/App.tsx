import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FixedCost } from './pages/FixedCost';
import { VariableCost } from './pages/VariableCost';
import { Suppliers } from './pages/Suppliers';
import { Ingredients } from './pages/Ingredients';
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

