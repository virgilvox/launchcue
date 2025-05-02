<template>
  <button 
    :class="[
      'px-4 py-2 rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
      variant === 'primary' ? 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500' : 
      variant === 'secondary' ? 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-500' :
      variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' :
      variant === 'outline' ? 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 focus:ring-gray-500' :
      'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
      size === 'small' ? 'text-xs' : size === 'large' ? 'text-base px-6 py-3' : 'text-sm',
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      fullWidth ? 'w-full' : '',
      className
    ]"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot></slot>
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger', 'outline'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  className: {
    type: String,
    default: ''
  }
});
</script> 