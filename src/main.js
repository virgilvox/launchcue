import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import Toast, { POSITION } from "vue-toastification";
import "vue-toastification/dist/index.css";

console.log('[main.js] Script loaded');

// Create the app
console.log('[main.js] Creating Vue app...');
const app = createApp(App)
console.log('[main.js] Vue app created');

// Initialize Pinia for state management
console.log('[main.js] Initializing Pinia...');
const pinia = createPinia()
app.use(pinia)
console.log('[main.js] Pinia initialized');

// Add router
console.log('[main.js] Adding router...');
app.use(router)
console.log('[main.js] Router added');

// Add Vue Toastification
console.log('[main.js] Adding Toastification...');
app.use(Toast, {
  position: POSITION.TOP_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false
});
console.log('[main.js] Toastification added');

// Mount the app
console.log('[main.js] Mounting app to #app...');
try {
  app.mount('#app')
  console.log('[main.js] App mounted successfully!');
} catch (error) {
  console.error('[main.js] Error mounting app:', error);
}
