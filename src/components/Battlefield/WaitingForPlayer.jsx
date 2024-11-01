// WaitingForPlayer.jsx
import React from 'react';
import styles from './WaitingForPlayer.module.css'; // CSS Module

/**
 * WaitingForPlayer Component
 * Displays a waiting message and room ID for the room creator.
 */
function WaitingForPlayer({ roomId, playerId }) {
    // Determine if the current player is the room creator
    const isRoomCreator = playerId === 'player1';

    // Function to copy roomId to clipboard
    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId)
            .then(() => {
                alert('Room ID copied to clipboard!');
            })
            .catch((err) => {
                console.error('Failed to copy Room ID: ', err);
            });
    };

    return (
        <div className={styles.waitingStage}>
            <h2>Waiting for Opponent...</h2>
            {isRoomCreator && (
                <div className={styles.roomIdSection}>
                    <p>Your Room ID:</p>
                    <div className={styles.roomIdDisplay}>
                        <input
                            type="text"
                            value={roomId}
                            readOnly
                            className={styles.roomIdInput}
                        />
                        <button onClick={copyRoomId} className={styles.copyButton}>Copy</button>
                    </div>
                </div>
            )}
            <p>Share the Room ID with your opponent to start the game.</p>
        </div>
    );
}

export default WaitingForPlayer;
