<script setup>
import { RouterView } from 'vue-router';
import './assets/main.css';
</script>

<template>
  <RouterView />
</template>

<style>
/* Ensure dark mode is always applied */
html, body {
  background-color: #111827;
  color: #f3f4f6;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
</style>
