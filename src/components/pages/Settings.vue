<template>
  <div class="mx-auto w-full max-w-[960px] p-4">
    <div v-if="activeView === 'main'">
      <h2 class="text-xl font-bold mb-4">Settings</h2>

      <div class="mb-4 flex w-full flex-col gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          @click="openPage(tab.id)"
          class="w-full rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-zinc-800"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        class="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center"
      >
        <p v-if="email" class="mb-3 text-sm text-gray-500">{{ email }}</p>
        <button
          type="button"
          :disabled="busy"
          @click="signOut"
          class="mx-auto block rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Sign Out
        </button>
        <p v-if="errorMessage" class="mt-3 text-sm text-red-600">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <div
      v-else-if="activeView === 'categories'"
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div class="mb-4 flex items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ← Back
        </button>
        <h3 class="text-lg font-semibold text-white">Categories</h3>
      </div>

      <div class="mb-4 grid w-full grid-cols-2 gap-2">
        <button
          v-for="categoryTab in categoryTabs"
          :key="categoryTab.id"
          type="button"
          @click="selectedCategoryTab = categoryTab.id"
          :class="[
            'w-full rounded-full border px-3 py-2 text-sm font-medium transition-colors',
            selectedCategoryTab === categoryTab.id
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-zinc-700 bg-zinc-800 text-gray-300 hover:bg-zinc-700',
          ]"
        >
          {{ categoryTab.label }}
        </button>
      </div>

      <div v-if="selectedCategoryTab === 'income'">
        <p class="text-sm text-gray-400">Income categories will go here.</p>
      </div>
      <div v-else>
        <p class="text-sm text-gray-400">Expense categories will go here.</p>
      </div>
    </div>

    <div
      v-else-if="activeView === 'regular-payments'"
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div class="mb-4 flex items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ← Back
        </button>
        <h3 class="text-lg font-semibold text-white">Regular payments</h3>
      </div>
      <p class="text-sm text-gray-400">Recurring payment rules will go here.</p>
    </div>

    <div
      v-else-if="activeView === 'budget'"
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div class="mb-4 flex items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ← Back
        </button>
        <h3 class="text-lg font-semibold text-white">Budget</h3>
      </div>
      <p class="text-sm text-gray-400">Budget settings will go here.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../../supabase';

const tabs = [
  { id: 'categories', label: 'Categories' },
  { id: 'regular-payments', label: 'Regular payments' },
  { id: 'budget', label: 'Budget' },
];

const categoryTabs = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
];

const activeView = ref('main');
const selectedCategoryTab = ref('income');
const email = ref('');
const busy = ref(false);
const errorMessage = ref('');

function openPage(page) {
  activeView.value = page;
}

function backToMain() {
  activeView.value = 'main';
}

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
