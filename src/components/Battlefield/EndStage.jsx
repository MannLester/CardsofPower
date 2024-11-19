// EndStage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../firebaseConfig';
import { doc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import styles from './EndStage.module.css';

/**
 * EndStage Component
 * Displays the end of the battle message and handles room cleanup.
 */
function EndStage({ roomId, winner, player1Username, player2Username, userDocId }) {
    const navigate = useNavigate();

    useEffect(() => {
        const cleanupRoom = async () => {
            if (!roomId) return;

            try {
                // Delete all subcollections first
                const collections = ['players', 'graveyard'];
                for (const collectionName of collections) {
                    const collectionRef = collection(firestore, 'rooms', roomId, collectionName);
                    const querySnapshot = await getDocs(collectionRef);
                    
                    for (const doc of querySnapshot.docs) {
                        await deleteDoc(doc.ref);
                    }
                }

                // Delete the room document itself
                const roomRef = doc(firestore, 'rooms', roomId);
                await deleteDoc(roomRef);

                console.log('Room cleanup completed successfully');
                toast.success('Game room cleaned up successfully');

                // Redirect to home page after 5 seconds
                setTimeout(() => {
                    navigate(`/${userDocId}/home`);
                }, 5000);
            } catch (error) {
                console.error('Error cleaning up room:', error);
                toast.error('Failed to clean up game room');
            }
        };

        // Set a timeout to clean up the room after showing the results
        const cleanupTimeout = setTimeout(cleanupRoom, 10000); // 10 seconds delay

        return () => {
            clearTimeout(cleanupTimeout);
        };
    }, [roomId, navigate, userDocId]);

    return (
        <div className={styles.endStage}>
            <h2>Battle Finished!</h2>
            <div className={styles.results}>
                <h3>Game Results</h3>
                <p className={styles.winner}>
                    Winner: <span>{winner}</span>
                </p>
                <div className={styles.players}>
                    <p>Player 1: {player1Username}</p>
                    <p>Player 2: {player2Username}</p>
                </div>
            </div>
            <p className={styles.message}>
                Room will be cleaned up and you will be redirected to the home page in 10 seconds...
            </p>
        </div>
    );
}

export default EndStage;
