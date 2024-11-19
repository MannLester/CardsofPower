import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { firestore } from './firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import aiImage from '../assets/images/ai.png';
import battleImage from '../assets/images/battle.png';
import shopImage from '../assets/images/shop.png';
import inventoryImage from '../assets/images/inventory.png';
import dictionaryImage from '../assets/images/dictionary.png';
import workshopImage from '../assets/images/workshop.png';
import friendsImage from '../assets/images/friends.png';
import loginBackground from '../assets/backgrounds/login.jpg';
import './HomePage.css'

function HomePage() {
  const { userDocId } = useParams();

  useEffect(() => {
    const updateCardDefPts = async () => {
      try {
        // Get user's inventory
        const userDocRef = doc(firestore, 'users', userDocId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.error('User not found');
          return;
        }

        const inventory = userDoc.data().inventory || [];

        // Update each card's defPts
        for (const cardId of inventory) {
          const cardDocRef = doc(firestore, 'cards', cardId);
          const cardDoc = await getDoc(cardDocRef);

          if (cardDoc.exists()) {
            const cardData = cardDoc.data();
            // Update inGameDefPts to match defPts
            await updateDoc(cardDocRef, {
              inGameDefPts: cardData.defPts
            });
            console.log('Card defense points updated');
          }
        }
      } catch (error) {
        console.error('Error updating card defense points:', error);
      }
    };

    if (userDocId) {
      updateCardDefPts();
    }
  }, [userDocId]);

  return (
    <main id='home' className='pirata-font text-center' style={{ backgroundImage: `url(${loginBackground})` }}>
      <div className="overlay"></div>

      <div className='banners'>
        <Link to={`/${userDocId}/battlefield`}><img src={aiImage} alt="" /></Link>
        <Link to={`/${userDocId}/battlefield`}><img src={battleImage} alt="" /></Link>
        <Link to="/shop"><img src={shopImage} alt="" /></Link>
      </div>

      <div className='links text-white text-xl'>
        <div className='sm:mx-6 lg:mx-12'>
          <Link to={`/${userDocId}/inventory`}>
            <img src={inventoryImage} alt="" />
            <p>Inventory</p>
          </Link>
        </div>

        <div className='sm:mx-6 lg:mx-12'>
          <Link to={`/${userDocId}/dictionary`}>
            <img src={dictionaryImage} alt="" />
            <p>Dictionary</p>
          </Link>
        </div>

        <div className='sm:mx-6 lg:mx-12'>
          <Link to={`/${userDocId}/workshop`}>
            <img src={workshopImage} alt="" />
            <p>Workshop</p>
          </Link>
        </div>

        <div className='sm:mx-6 lg:mx-12'>
          <Link to={`/${userDocId}/friends`}>
            <img src={friendsImage} alt="" />
            <p>Friends</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default HomePage;