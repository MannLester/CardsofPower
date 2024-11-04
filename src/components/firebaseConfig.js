// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2n15tcB_jWIRpfHXD3z5VjWdRD1YX410",
  authDomain: "cards-of-power.firebaseapp.com",
  databaseURL: "https://cards-of-power-default-rtdb.firebaseio.com",
  projectId: "cards-of-power",
  storageBucket: "cards-of-power.appspot.com",
  messagingSenderId: "285200898017",
  appId: "1:285200898017:web:07c57eaa0dc6abb1e064a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app);
const database = getDatabase(app);

export { storage, database, firestore };