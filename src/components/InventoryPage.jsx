// InventoryPage.jsx

//FOR JETT MARK

//card.imageUrl = link of images
//card.cardName = cardName
//card.id = documentId

//this code takes the documentId from the url into the params to compare in the database
import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import { storage, firestore } from './firebaseConfig';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';


function InventoryPage() {
  const { userDocId } = useParams();
  const [inventoryCards, setInventoryCards] = useState([]);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const userDocRef = doc(firestore, 'users', userDocId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const inventoryIds = userDoc.data().inventory || [];

          const cardsData = await Promise.all(
            inventoryIds.map(async (cardId) => {
              const cardDocRef = doc(firestore, 'cards', cardId);
              const cardDoc = await getDoc(cardDocRef);

              if (cardDoc.exists()) {
                const cardData = cardDoc.data();
                const imageRef = storageRef(storage, cardData.imageUrl);
                const imageUrl = await getDownloadURL(imageRef);

                return { ...cardData, imageUrl };
              }
              return null;
            })
          );

          setInventoryCards(cardsData.filter((card) => card !== null));
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    }

    fetchInventory();
  }, [userDocId]);

  return (
    <div>
      <h1>Inventory Page</h1>
      <div>
        {inventoryCards.map((card) => (
          <div key={card.id}>
            <img src={card.imageUrl} alt={card.cardName || "Card Image"} />
            <p>{card.cardName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InventoryPage;