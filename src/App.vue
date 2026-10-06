<template>
  <p v-if="!ready" class="p-4">Завантаження…</p>
  <AuthScreen v-else-if="!session" />
  <div v-else>
    <component :is="currentPage" />
    <BottomNav :current="current" @navigate="navigateTo" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { supabase } from './supabase';
import AuthScreen from './components/AuthScreen.vue';
import BottomNav from './components/Navigation.vue';

import Dashboard from './components/pages/Dashboard.vue';
import Accounts from './components/pages/Accaunts.vue';
import Reports from './components/pages/Reports.vue';
import Settings from './components/pages/Settings.vue';

const current = ref('Dashboard');
const session = ref(null);
const ready = ref(false);

const pages = {
  Dashboard,
  Accounts,
  Reports,
  Settings,
};

const currentPage = computed(() => pages[current.value]);

let authSubscription;

onMounted(async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.error(error);
  session.value = data.session;
  ready.value = true;

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, nextSession) => {
      session.value = nextSession;
    }
  );
  authSubscription = listener.subscription;
});

onUnmounted(() => {
  authSubscription?.unsubscribe();
});

function navigateTo(page) {
  current.value = page;
}
</script>
