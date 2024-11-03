import Battlefield from "./components/Battlefield";
import HomePage from "./components/HomePage";
import InventoryPage from "./components/InventoryPage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import NewBattlefield from "./components/NewBattlefield";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <Routes>
          <Route path="/battlefield" element={<NewBattlefield />}/>
          <Route path="/inventory" element={<InventoryPage />}/>
          <Route path="/login" element={<LoginPage />}/>
          <Route path="/signup" element={<SignupPage />}/>
          <Route path="/" element={<HomePage />}/>
        </Routes>
      </Router>
    </DndProvider>
  );
}

export default App;
