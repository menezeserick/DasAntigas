import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDW7Dzg9eCqFFl-NbEPsjV-0s6V2UrMeoM",
  authDomain: "sistemadasantigas-e37c9.firebaseapp.com",
  projectId: "sistemadasantigas-e37c9",
  storageBucket: "sistemadasantigas-e37c9.appspot.com",
  messagingSenderId: "753846277141",
  appId: "1:753846277141:web:13a08bbd6fed6abe80ea1c",
  measurementId: "G-YS0D31BYK6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { db };
export { auth };