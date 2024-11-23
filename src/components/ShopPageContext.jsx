import React from 'react';
import PropTypes from 'prop-types';  // Import PropTypes

// The ShopPageContext component is receiving props and displaying them
const ShopPageContext = ({ asset, sellerName, buttonText, onButtonClick }) => {
    return (
        <div className="shop-item-card">
            <img src={asset.imageUrl} alt={asset.cardName} className="item-image" />
            <h2>{asset.cardName}</h2>
            <p><strong>Seller:</strong> {sellerName}</p>
            <button onClick={onButtonClick}>{buttonText}</button>
        </div>
    );
};

// Define prop types for validation
ShopPageContext.propTypes = {
    asset: PropTypes.shape({
        imageUrl: PropTypes.string.isRequired,  // imageUrl should be a string and is required
        cardName: PropTypes.string.isRequired,  // cardName should be a string and is required
    }).isRequired,
    sellerName: PropTypes.string.isRequired,  // sellerName should be a string and is required
    buttonText: PropTypes.string.isRequired,  // buttonText should be a string and is required
    onButtonClick: PropTypes.func.isRequired,  // onButtonClick should be a function and is required
};

export default ShopPageContext;
