import Battlefield from "./components/Battlefield/Battlefield.jsx";
import LoginPage from "./components/LoginPage.jsx";
import SignupPage from "./components/SignupPage.jsx";
import HomePage from "./components/HomePage.jsx";
import InventoryPage from "./components/InventoryPage.jsx";
import User from "./components/User.jsx";
import './styles/global.css';
import { UserProvider } from "./components/UserContext.jsx";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <UserProvider>
    <Router>
      <Routes>
        {/* Only use for actual implementation */ }

        {/* <Route path="/battlefield" element={<Battlefield />}/> */}
        <Route path="/login" element={<LoginPage />}/> 
        <Route path="/signup" element={<SignupPage />}/> 
        <Route path="/home" element={<HomePage />}/> 
        <Route path="/inventory" element={<InventoryPage />}/>
        <Route path="/user" element={<User />}/>

        {/* Only use for testing implementation */}
        <Route path="/" element={<Battlefield />}/>
      </Routes>
    </Router>
    </UserProvider>
  );
}

export default App;
