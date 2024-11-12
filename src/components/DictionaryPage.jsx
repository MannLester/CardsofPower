// DictionaryPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { firestore, storage } from "./firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref as storageRef, getDownloadURL } from "firebase/storage";
import './DictionaryPage.css'

function DictionaryPage() {
  const { userDocId } = useParams();
  const [allCards, setAllCards] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const fetchInventoryAndCards = async () => {
      try {
        // Fetch the user's inventory
        const userDocRef = doc(firestore, "users", userDocId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setInventory(userDocSnap.data().inventory || []);
        }

        // Fetch all cards from the cards collection
        const cardsSnapshot = await getDocs(collection(firestore, "cards"));
        const cardsData = [];
        for (let card of cardsSnapshot.docs) {
          const cardData = card.data();
          // Get the image URL from Firebase Storage
          const imageRef = storageRef(storage, cardData.imageUrl);
          cardData.imageUrl = await getDownloadURL(imageRef);
          cardData.id = card.id; // Store card ID for comparison
          cardsData.push(cardData);
        }
        setAllCards(cardsData);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchInventoryAndCards();
  }, [userDocId]);

  return (
    <div>
      <h1>Dictionary</h1>
      <div className="cards-container">
        {allCards.map((card) => (
          <div
            key={card.id}
            //if the card is not owned by the player it will appear as black-and-white
            className={`card ${inventory.includes(card.id) ? "" : "black-and-white"}`}
          >
            <img src={card.imageUrl} alt={card.name} />
            <p>{card.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DictionaryPage;
