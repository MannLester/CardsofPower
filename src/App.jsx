import Battlefield from "./components/Battlefield/Battlefield.jsx";
import LoginPage from "./components/LoginPage.jsx";
import SignupPage from "./components/SignupPage.jsx";
import './styles/global.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        {/* Only use for actual implementation */ }

        {/* <Route path="/battlefield" element={<Battlefield />}/> */}
        <Route path="/login" element={<LoginPage />}/> 
        <Route path="/signup" element={<SignupPage />}/> 

        {/* Only use for testing implementation */}
        <Route path="/" element={<Battlefield />}/>
      </Routes>
    </Router>
  );
}

export default App;
