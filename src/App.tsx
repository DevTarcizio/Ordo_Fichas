import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import PrivateRoute from "./routes/PrivateRoute"
import CreateCharacter from "./pages/CreateCharacter"

function App() {
  return (
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


    </Routes>
  )
}

export default App
