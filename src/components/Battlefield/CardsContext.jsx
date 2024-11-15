// CardsContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { firestore, storage } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';

export const CardsContext = createContext();

export const CardsProvider = ({ children }) => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const cardsCollection = collection(firestore, 'cards');
                const cardSnapshot = await getDocs(cardsCollection);
                const cardPromises = cardSnapshot.docs.map(async (doc) => {
                    const cardData = doc.data();
                    const imagePath = cardData.imageUrl; // Assuming imageUrl is the Storage path
                    let imageUrl = '';
                    if (imagePath) {
                        try {
                            imageUrl = await getDownloadURL(storageRef(storage, imagePath));
                        } catch (error) {
                            console.error(`Error fetching image for card ID ${doc.id}:`, error);
                            imageUrl = ''; // Fallback to empty string or a default image
                        }
                    }
                    return {
                        id: doc.id, // Include Firestore document ID
                        ...cardData,
                        imageUrl
                    };
                });

                const cardsWithUrls = await Promise.all(cardPromises);
                setCards(cardsWithUrls);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching cards:', err);
                setError(err);
                setLoading(false);
            }
        };

        fetchCards();
    }, []);

    return (
        <CardsContext.Provider value={{ cards, loading, error }}>
            {children}
        </CardsContext.Provider>
    );
};

// in the long run, you'll win