import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import PrivateRoute from "./routes/PrivateRoute"

const Home = lazy(() => import("./pages/Home"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const CreateCharacter = lazy(() => import("./pages/CreateCharacter"))
const CharacterSheet = lazy(() => import("./pages/CharacterSheet"))

function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white">
          Carregando...
        </div>
      }
    >
      <Routes>
     
      <Route 
        path="/" 
        element={<Home />}
      />

      <Route 
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route 
        path="/characters/create"
        element={
          <PrivateRoute>
            <CreateCharacter />
          </PrivateRoute>
        }
      />

      <Route 
        path="/characters/:id"
        element={
          <PrivateRoute>
            <CharacterSheet />
          </PrivateRoute>
        }
      />


      </Routes>
    </Suspense>
  )
}

export default App
