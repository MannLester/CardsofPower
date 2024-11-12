import Battlefield from "./components/Battlefield/Battlefield.jsx";
import LoginPage from "./components/LoginPage.jsx";
import HomePage from "./components/HomePage.jsx";
import InventoryPage from "./components/InventoryPage.jsx";
import DictionaryPage from "./components/DictionaryPage.jsx";
import { CardsContext, CardsProvider } from "./components/Battlefield/CardsContext.jsx";
import './styles/global.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <CardsProvider>
      <Router>
      <Routes>
        {/* Only use for actual implementation */ }

        <Route path="/:userDocId/battlefield" element={<Battlefield />}/>
        <Route path="/" element={<LoginPage />}/> 
        <Route path="/:userDocId/home" element={<HomePage />}/> 
        <Route path="/:userDocId/inventory" element={<InventoryPage />}/>
        <Route path="/:userDocId/dictionary" element={<DictionaryPage />}/>
        {/* Only use for testing implementation */}
        {/* <Route path="/" element={<Battlefield />}/> */}
      </Routes>
    </Router>
    </CardsProvider>
  );
}

export default App;