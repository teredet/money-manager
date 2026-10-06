<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-2">Settings</h2>
    <p v-if="email" class="mb-4 text-sm text-gray-500">{{ email }}</p>
    <button type="button" :disabled="busy" @click="signOut">Вийти</button>
    <p v-if="errorMessage" class="mt-3 text-sm text-red-600">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../../supabase';

const email = ref('');
const busy = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  email.value = data.session?.user?.email ?? '';
});

async function signOut() {
  errorMessage.value = '';
  busy.value = true;
  const { error } = await supabase.auth.signOut();
  busy.value = false;
  if (error) errorMessage.value = error.message;
}
</script>
