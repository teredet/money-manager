<template>
  <form class="mx-auto w-full max-w-sm p-4 text-left" @submit.prevent="submit">
    <h2 class="text-xl font-bold mb-1">Money Manager</h2>
    <p class="mb-4 text-sm text-gray-500">
      Увійдіть, щоб бачити лише свої рахунки.
    </p>

    <label class="mb-1 block text-sm" for="email">Email</label>
    <input
      id="email"
      v-model="email"
      class="mb-3 w-full rounded border px-3 py-2"
      type="email"
      autocomplete="email"
      required
    />

    <label class="mb-1 block text-sm" for="password">Пароль</label>
    <input
      id="password"
      v-model="password"
      class="mb-3 w-full rounded border px-3 py-2"
      type="password"
      minlength="6"
      :autocomplete="mode === 'sign-in' ? 'current-password' : 'new-password'"
      required
    />

    <p
      v-if="message"
      class="mb-3 text-sm"
      :class="messageIsError ? 'text-red-600' : 'text-gray-500'"
    >
      {{ message }}
    </p>

    <button
      class="w-full bg-green-600 text-white"
      type="submit"
      :disabled="busy"
    >
      {{ mode === 'sign-in' ? 'Увійти' : 'Створити акаунт' }}
    </button>

    <button class="mt-3 text-sm" type="button" @click="toggleMode">
      {{
        mode === 'sign-in'
          ? 'Немає акаунта? Зареєструватись'
          : 'Вже є акаунт? Увійти'
      }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { supabase } from '../supabase';

const mode = ref('sign-in');
const email = ref('');
const password = ref('');
const message = ref('');
const messageIsError = ref(false);
const busy = ref(false);

function toggleMode() {
  mode.value = mode.value === 'sign-in' ? 'sign-up' : 'sign-in';
  message.value = '';
}

async function submit() {
  message.value = '';
  busy.value = true;

  const credentials = {
    email: email.value.trim(),
    password: password.value,
  };

  const { data, error } =
    mode.value === 'sign-in'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);

  busy.value = false;

  if (error) {
    message.value = error.message;
    messageIsError.value = true;
    return;
  }

  if (mode.value === 'sign-up' && !data.session) {
    message.value =
      'Лист для підтвердження надіслано. Після підтвердження увійдіть.';
    messageIsError.value = false;
    mode.value = 'sign-in';
  }
}
</script>
