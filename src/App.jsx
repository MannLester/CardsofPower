import Battlefield from "./components/Battlefield/Battlefield.jsx";
import { CardsContext, CardsProvider } from "./components/Battlefield/CardsContext.jsx";
import './styles/global.css';

function App() {
  return (
    <CardsProvider>
      <Battlefield />
    </CardsProvider>
  );
}

export default App;
