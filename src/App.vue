<template>
  <div class="w-max h-max app">
    <component :is="currentPage" />

    <BottomNav :current="current" @navigate="navigateTo" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import BottomNav from './components/Navigation.vue';

import Dashboard from './components/pages/Dashboard.vue';
import Accounts from './components/pages/Accaunts.vue';
import Reports from './components/pages/Reports.vue';
import Settings from './components/pages/Settings.vue';

const current = ref('Dashboard');

const pages = {
  Dashboard,
  Accounts,
  Reports,
  Settings,
};

const currentPage = computed(() => pages[current.value]);

function navigateTo(page) {
  current.value = page;
}
</script>
