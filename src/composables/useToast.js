import { ref } from 'vue';

// Create a reactive array of toasts
const toasts = ref([]);

// Function to add a toast
function addToast(message, type = 'info', duration = 3000) {
  const id = Date.now();
  toasts.value.push({ id, message, type });
  
  // Auto remove toast after duration
  setTimeout(() => {
    removeToast(id);
  }, duration);
  
  return id;
}

// Function to remove a toast
function removeToast(id) {
  const index = toasts.value.findIndex(toast => toast.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
}

// Toast type helper functions
function success(message, duration) {
  return addToast(message, 'success', duration);
}

function error(message, duration) {
  return addToast(message, 'error', duration);
}

function warning(message, duration) {
  return addToast(message, 'warning', duration);
}

function info(message, duration) {
  return addToast(message, 'info', duration);
}

// Export the toast API
export function useToast() {
  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast
  };
} 