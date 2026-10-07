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
      v-else-if="activeView === 'default-account'"
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div class="mb-4 grid grid-cols-[24px_1fr_24px] items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ←
        </button>
        <h3 class="text-center text-lg font-semibold text-white">
          Default account
        </h3>
        <span aria-hidden="true"></span>
      </div>

      <div class="space-y-4">
        <div v-for="type in defaultAccountTypes" :key="type.id">
          <label class="mb-1 block text-sm text-gray-300">
            {{ type.label }}
          </label>
          <select
            :value="defaultAccountIds[type.id]"
            @change="updateDefaultAccount(type.id, $event.target.value)"
            class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          >
            <option value="">No default</option>
            <option
              v-for="account in accounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>
        </div>
      </div>
      <p v-if="settingsError" class="mt-3 text-sm text-red-600">
        {{ settingsError }}
      </p>
    </div>

    <div
      v-else-if="activeView === 'categories'"
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div class="mb-4 grid grid-cols-[24px_1fr_24px] items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ←
        </button>
        <h3 class="text-center text-lg font-semibold text-white">Categories</h3>
        <span aria-hidden="true"></span>
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
      <div class="mb-4 grid grid-cols-[24px_1fr_24px] items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ←
        </button>
        <h3 class="text-center text-lg font-semibold text-white">
          Regular payments
        </h3>
        <span aria-hidden="true"></span>
      </div>
      <p class="text-sm text-gray-400">Recurring payment rules will go here.</p>
    </div>

    <div
      v-else-if="activeView === 'budget'"
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div class="mb-4 grid grid-cols-[24px_1fr_24px] items-center gap-3">
        <button type="button" class="text-sm text-gray-400" @click="backToMain">
          ←
        </button>
        <h3 class="text-center text-lg font-semibold text-white">Budget</h3>
        <span aria-hidden="true"></span>
      </div>
      <p class="text-sm text-gray-400">Budget settings will go here.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../../supabase';
import {
  fetchDefaultAccounts,
  saveDefaultAccounts,
} from '../../defaultAccount.js';

const tabs = [
  { id: 'default-account', label: 'Default account' },
  { id: 'categories', label: 'Categories' },
  { id: 'regular-payments', label: 'Regular payments' },
  { id: 'budget', label: 'Budget' },
];

const defaultAccountTypes = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expenses' },
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
const accounts = ref([]);
const defaultAccountIds = ref({ income: '', expense: '' });
const settingsError = ref('');

function applyDefaultAccounts(defaults) {
  defaultAccountIds.value = {
    income: defaults.income ?? '',
    expense: defaults.expense ?? '',
  };
}

async function loadAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    settingsError.value = error.message;
    return;
  }
  accounts.value = data ?? [];
}

async function loadDefaultAccounts() {
  try {
    applyDefaultAccounts(await fetchDefaultAccounts(supabase));
  } catch (error) {
    settingsError.value = error.message;
  }
}

async function updateDefaultAccount(type, value) {
  const previous = { ...defaultAccountIds.value };
  const normalized = value === '' ? '' : String(value);
  defaultAccountIds.value = {
    ...defaultAccountIds.value,
    [type]: normalized,
  };

  try {
    const saved = await saveDefaultAccounts(
      {
        income: defaultAccountIds.value.income || null,
        expense: defaultAccountIds.value.expense || null,
      },
      supabase,
    );
    applyDefaultAccounts(saved);
    settingsError.value = '';
  } catch (error) {
    defaultAccountIds.value = previous;
    settingsError.value = error.message;
  }
}

function openPage(page) {
  activeView.value = page;
}

function backToMain() {
  activeView.value = 'main';
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  email.value = data.session?.user?.email ?? '';
  await Promise.all([loadAccounts(), loadDefaultAccounts()]);
});

async function signOut() {
  errorMessage.value = '';
  busy.value = true;
  const { error } = await supabase.auth.signOut();
  busy.value = false;
  if (error) errorMessage.value = error.message;
}
</script>
