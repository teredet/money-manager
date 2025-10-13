<template>
  <nav
    class="fixed bottom-0 left-0 w-full bg-zinc-900 flex justify-around py-2 shadow-md"
  >
    <button
      v-for="item in items"
      :key="item.name"
      @click="$emit('navigate', item.name)"
      class="flex flex-col items-center text-sm"
      :class="
        current === item.name ? 'text-white-600 font-semibold' : 'text-gray-500'
      "
    >
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup>
defineProps({
  current: String,
});

const items = [
  { name: 'Dashboard', label: 'Dashboard' },
  { name: 'Accounts', label: 'Accounts' },
  { name: 'Reports', label: 'Reports' },
  { name: 'Settings', label: 'Settings' },
];
</script>
