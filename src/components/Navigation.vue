<template>
  <nav
    class="fixed bottom-0 left-0 w-full bg-zinc-900 flex justify-around py-2 shadow-md pb-6"
  >
    <RouterLink
      v-for="item in items"
      :key="item.name"
      :to="{ name: item.name }"
      :aria-label="item.name"
      class="flex flex-col items-center text-sm"
      :class="
        route.name === item.name ? 'text-white font-semibold' : 'text-gray-500'
      "
    >
      <component :is="item.component" class="" />
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router';
import {
  LayoutDashboard,
  Wallet,
  ChartSpline,
  Settings,
} from 'lucide-vue-next';

const route = useRoute();

const items = [
  { name: 'Dashboard', component: LayoutDashboard },
  { name: 'Accounts', component: Wallet },
  { name: 'Reports', component: ChartSpline },
  { name: 'Settings', component: Settings },
];
</script>
