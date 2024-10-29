import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import './Battlefield.css';

// Firebase configuration (could be set up via environment variables if needed)
const firebaseConfig = {
  apiKey: "AIzaSyB2n15tcB_jWIRpfHXD3z5VjWdRD1YX410", 
  authDomain: "cards-of-power.firebaseapp.com",
  projectId: "cards-of-power",
  storageBucket: "cards-of-power.appspot.com",
  messagingSenderId: "285200898017",
  appId: "1:285200898017:web:3dcc4c62eaf3b77fe064a0"
};

// Initialize Firebase only if it hasn't been initialized already
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

function Battlefield() {
  const [cardUrls, setCardUrls] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      const cardRefs = [
        { name: 'backCard', path: 'assets/cards/back-card.png' },
        { name: 'graveyardCard', path: 'assets/cards/graveyard.png' },
        { name: 'leftBtn', path: 'assets/others/leftBtn.png' },
        { name: 'rightBtn', path: 'assets/others/rightBtn.png' },

        // Add paths for all cards you need from Firebase Storage


        // { name: 'card1', path: 'assets/cards/Divine/AethersWrath.png' },
        // { name: 'card2', path: 'assets/cards/Divine/BaneOfExistence.png' },
        // { name: 'card3', path: 'assets/cards/Divine/CelestialOutcast.png' },
        // { name: 'card4', path: 'assets/cards/Divine/CelestialZenith.png' },
        // { name: 'card5', path: 'assets/cards/Divine/ForgemasterOfCreation.png' },
        // { name: 'card6', path: 'assets/cards/Earth/EarthGolem.png' },
        // { name: 'card7', path: 'assets/cards/Earth/HeartOfTheMountain.png' },
        // { name: 'card8', path: 'assets/cards/Earth/IroncladDefender.png' },
        // { name: 'card9', path: 'assets/cards/Earth/SteelGuardian.png' },
        // { name: 'card10', path: 'assets/cards/Earth/StoneSentinel.png' },
        // { name: 'card11', path: 'assets/cards/Light/CrystalGuardian.png' },
        // { name: 'card12', path: 'assets/cards/Light/ElectricSabre.png' },
        // { name: 'card13', path: 'assets/cards/Light/LightbinderPaladin.png' },
        // { name: 'card14', path: 'assets/cards/Light/LunarWolf.png' },
        // { name: 'card15', path: 'assets/cards/Light/SolarGuardian.png' },
      ];

      const urls = {};
      await Promise.all(
        cardRefs.map(async (card) => {
          const url = await getDownloadURL(ref(storage, card.path));
          urls[card.name] = url;
        })
      );

      setCardUrls(urls);
      setLoading(false);
    };

    loadImages();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }


  // Now use `cardUrls` instead of static imports
  const opponentCards = [cardUrls.backCard, cardUrls.backCard, cardUrls.backCard, cardUrls.backCard, cardUrls.backCard];
  const opponentDeck = Array(5).fill(cardUrls.backCard);
  const opponentGraveyard = Array(5).fill(cardUrls.backCard);
  const myCards = [cardUrls.backCard, cardUrls.card3, cardUrls.backCard, cardUrls.card4, cardUrls.card5];
  const myDeck = [
    cardUrls.backCard, cardUrls.backCard, cardUrls.backCard, cardUrls.backCard, cardUrls.backCard,
    cardUrls.backCard, cardUrls.backCard, cardUrls.backCard, cardUrls.backCard, cardUrls.backCard
  ];
  const myGraveyard = Array(5).fill(cardUrls.backCard);

  function Timer() {
    return (
      <div className="timer">
        <p>Turn 6</p>
        <p>30s</p>
      </div>
    );
  }

  function Utilities({ username, deck, graveyard }) {
    const [isGraveyardVisible, setIsGraveyardVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const cardsToShow = 6;
    const blankCard = cardUrls.backCard;

    const toggleGraveyard = () => setIsGraveyardVisible(!isGraveyardVisible);

    const handleNext = () => {
      if (currentIndex + cardsToShow < deck.length) {
        setCurrentIndex(currentIndex + cardsToShow);
      }
    };

    const handlePrevious = () => {
      if (currentIndex - cardsToShow >= 0) {
        setCurrentIndex(currentIndex - cardsToShow);
      }
    };

    const visibleCards = deck.slice(currentIndex, currentIndex + cardsToShow);
    const blankCardCount = Math.max(0, cardsToShow - visibleCards.length);

    return (
      <>
        {isGraveyardVisible && (
          <div className="graveyard">
            <button onClick={toggleGraveyard}>Close</button>
            <h2>{username}'s Graveyard</h2>
            <div className="graveyardCards">
              {graveyard.map((card, index) => (
                <img className="m-2" key={index} src={card} alt={`Graveyard Card ${index + 1}`} />
              ))}
            </div>
          </div>
        )}

        <div className="row">
          <img onClick={toggleGraveyard} src={cardUrls.graveyardCard} alt="" />
          <div className="carousel">
            <button onClick={handlePrevious} className="me-2" disabled={currentIndex === 0}>
              <img src={cardUrls.leftBtn} alt="Previous" />
            </button>
            <div className="deck">
              {visibleCards.map((card, index) => (
                <img key={index} src={card} alt={`Card ${currentIndex + index + 1}`} />
              ))}
              {Array.from({ length: blankCardCount }).map((_, index) => (
                <img key={`blank-${index}`} src={blankCard} alt="Blank Card" />
              ))}
            </div>
            <button onClick={handleNext} className="ms-2" disabled={currentIndex + cardsToShow >= deck.length}>
              <img src={cardUrls.rightBtn} alt="Next" />
            </button>
          </div>

          <div className="stats">
            <p>{username}</p>
            <p>HP: 5000</p>
            <p>Cards: 10</p>
          </div>
        </div>
      </>
    );
  }

  function CardSlots({ cards }) {
    return (
      <div className="card-slot my-4">
        {cards.map((card, index) => (
          <img key={index} src={card} alt={`Card ${index + 1}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="background">
      <Timer />
      <Utilities username="player one" deck={opponentDeck} graveyard={opponentGraveyard} />
      <div className="mid-row">
        <div>
          <CardSlots cards={opponentCards} />
          <CardSlots cards={myCards} />
        </div>
        <img className="last-card" src={cardUrls.card1} alt="" />
      </div>
      <Utilities username="player two" deck={myDeck} graveyard={myGraveyard} />
    </div>
  );
}

export default Battlefield;
