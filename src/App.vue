<script setup>
import { RouterView } from 'vue-router';
import './assets/main.css';
</script>

<template>
  <RouterView />
</template>

<style>
html, body {
  background-color: var(--page-bg);
  color: var(--page-text);
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
</style>
