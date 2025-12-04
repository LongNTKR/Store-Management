import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { ProductsPage } from './pages/ProductsPage'
import { TrashPage } from './pages/TrashPage'
import { ImportPage } from './pages/ImportPage'
import { SearchPage } from './pages/SearchPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { CustomersPage } from './pages/CustomersPage'
import { StatsPage } from './pages/StatsPage'

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </Layout>
    </>
  )
}

export default App
