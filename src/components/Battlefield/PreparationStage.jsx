// PreparationStage.jsx
import React from 'react';
import styles from './PreparationStage.module.css'; // CSS Module

/**
 * PreparationStage Component
 * Displays the preparation stage message.
 */
function PreparationStage() {
    return (
        <div className={styles.preparationStage}>
            <h2>Preparation Stage</h2>
            <p>Get ready for the battle! You have 1 minute to prepare your strategy.</p>
        </div>
    );
}

export default PreparationStage;
