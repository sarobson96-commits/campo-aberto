const firebaseConfig = {
  apiKey: "AIzaSyD5Hq54ivjbd299rC0GW8B1CPYVIA-rzNI",
  authDomain: "joga-junto-8ec6e.firebaseapp.com",
  projectId: "joga-junto-8ec6e",
  storageBucket: "joga-junto-8ec6e.appspot.com",
  messagingSenderId: "798513047421",
  appId: "1:798513047421:web:0673d5c26ac1b542a80e14"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
console.log("✅ Firebase conectado!");
