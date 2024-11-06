// HomePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  const goToInventory = () => {
    navigate("/inventory");
  };

  return (
    <div>
      <h1>Home Page</h1>
      <button onClick={goToInventory}>Go to Inventory Page</button>
    </div>
  );
}

export default HomePage;
