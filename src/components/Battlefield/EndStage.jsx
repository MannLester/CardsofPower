// EndStage.jsx
import React from 'react';
import styles from './EndStage.module.css'; // CSS Module

/**
 * EndStage Component
 * Displays the end of the battle message.
 */
function EndStage() {
    return (
        <div className={styles.endStage}>
            <h2>Battle Finished</h2>
            <p>Congratulations! The battle has concluded.</p>
            {/* You can add more details like results, scores, etc. */}
        </div>
    );
}

export default EndStage;
