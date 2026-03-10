import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createAppRouter } from './router'
import './assets/main.css'
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { useAuthStore } from './stores/auth'

// Core infrastructure
import { initContainer } from './core/service-container'
import { initEventBus } from './core/event-bus'
import { initPluginRegistry } from './core/plugin-registry'
import { registerSupabaseAdapters } from './adapters/supabase'
import { registerAllModules } from './modules'

async function bootstrap() {
  // 1. Initialize core infrastructure
  const container = initContainer()
  const eventBus = initEventBus()
  const registry = initPluginRegistry()

  // 2. Register backend adapters
  registerSupabaseAdapters(container)

  // 3. Register feature modules
  registerAllModules(registry)

  // 4. Initialize modules (runs setup() in dependency order)
  await registry.initialize(container)

  // 5. Create Vue app
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 6. Initialize auth state early — checks token expiry before any route navigation
  const authStore = useAuthStore()
  authStore.initAuth()

  // 7. Create router with dynamic module routes
  const router = createAppRouter(registry)
  app.use(router)

  // 8. Provide core services globally
  app.provide('container', container)
  app.provide('eventBus', eventBus)
  app.provide('registry', registry)

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
    closeButton: 'button',
    icon: true,
    rtl: false
  })

  // Global Vue error handler
  app.config.errorHandler = (err, instance, info) => {
    console.error('Unhandled Vue error:', err)
    console.error('Component:', instance?.$options?.name || 'unknown')
    console.error('Info:', info)
  }

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
  })

  app.mount('#app')
}

bootstrap()
