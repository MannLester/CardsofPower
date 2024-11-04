// loadFirestoreCards.js
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../firebaseConfig'; // Adjust the path as necessary

/**
 * Custom Hook: useCards
 * Fetches the 'cards' collection from Firestore and returns the data along with loading and error states.
 */
const useCards = () => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                // Reference to the 'cards' collection
                const cardsRef = collection(firestore, 'cards');
                
                // Fetch all documents in the 'cards' collection
                const snapshot = await getDocs(cardsRef);
                
                // Map through the documents and extract data along with the document ID
                const cardsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setCards(cardsList);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching cards:', err);
                setError(err);
                setLoading(false);
            }
        };

        fetchCards();
    }, []);

    return { cards, loading, error };
};

export default useCards;
