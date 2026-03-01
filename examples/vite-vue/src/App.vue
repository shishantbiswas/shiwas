<script setup lang="ts">
import { useSWR } from 'shiwas/vue'
const { data, error, isLoading, isValidating } = useSWR(
  "https://jsonplaceholder.typicode.com/posts/1",
  (url: any) => fetch(url).then(res => res.json())
);
console.log(data.value, error.value, isLoading.value, isValidating.value)
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    {{ data }}
  </div>
</template>

<style scoped></style>
