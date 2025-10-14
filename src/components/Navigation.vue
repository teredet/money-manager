<template>
  <nav
    class="fixed bottom-0 left-0 w-full bg-zinc-900 flex justify-around py-2 shadow-md pb-6"
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
      <component :is="item.component" class="" />
    </button>
  </nav>
</template>

<script setup>
defineProps({
  current: String,
});

import {
  LayoutDashboard,
  Wallet,
  ChartSpline,
  Settings,
} from 'lucide-vue-next';

const items = [
  { name: 'Dashboard', component: LayoutDashboard },
  { name: 'Accounts', component: Wallet },
  { name: 'Reports', component: ChartSpline },
  { name: 'Settings', component: Settings },
];
</script>
