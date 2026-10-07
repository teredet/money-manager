<template>
  <p v-if="!ready" class="p-4">Завантаження…</p>
  <AuthScreen v-else-if="!session" />
  <div v-else>
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from './supabase';
import AuthScreen from './components/AuthScreen.vue';
import BottomNav from './components/Navigation.vue';

const session = ref(null);
const ready = ref(false);

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
</script>
