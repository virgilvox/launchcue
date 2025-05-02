import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import Toast, { POSITION } from "vue-toastification";
import "vue-toastification/dist/index.css";

// Create the app
const app = createApp(App)

// Initialize Pinia for state management
const pinia = createPinia()
app.use(pinia)

// Add router
app.use(router)

// Add Vue Toastification
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

// Mount the app
app.mount('#app')
