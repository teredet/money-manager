<template>
  <AddAccount
    v-if="adding"
    :categories="categories"
    :currencies="currencies"
    :rates="rates"
    :rates-status="ratesStatus"
    @cancel="adding = false"
    @saved="onAccountSaved"
  />
  <div v-else class="p-4 pb-20 w-[80vw]">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <div v-if="showTotal" class="text-left">
        <div class="text-3xl font-semibold text-green-600">{{ totalText }}</div>
        <p
          v-if="totalNote"
          class="mt-1 whitespace-pre-line text-xs font-normal text-gray-500"
        >
          {{ totalNote }}
        </p>
      </div>
      <div v-else class="text-3xl font-semibold text-green-600">**********</div>
      <button @click="toggleTotal" class="text-sm text-gray-500">
        <component
          :is="showTotal ? EyeOff : Eye"
          class="w-5 h-5 text-gray-600"
        />
      </button>
    </div>

    <p v-if="listsError" class="mb-3 text-sm text-red-600">{{ listsError }}</p>
    <p v-else-if="!listsReady" class="mb-3 text-sm text-gray-500">Завантаження…</p>

    <!-- Categories -->
    <div
      v-for="(accounts, category) in groupedAccounts"
      :key="category"
      class="mb-3 border rounded-lg bg-zinc-1000 shadow-sm"
    >
      <button
        class="w-full text-left p-3 flex justify-between items-center"
        @click="toggleCategory(category)"
      >
        <span class="font-semibold text-white">{{ category }}</span>
        <span class="text-white">
          {{ isCollapsed(category) ? '+' : '–' }}
        </span>
      </button>

      <div v-show="!isCollapsed(category)" class="border-t px-3 py-2">
        <p v-if="accounts.length === 0" class="py-2 text-sm text-gray-500">
          Немає рахунків
        </p>
        <div
          v-for="acc in accounts"
          :key="acc.id"
          class="flex justify-between py-1 border-b last:border-none"
        >
          <span class="text-white">{{ acc.name }}</span>
          <span class="font-medium text-white">{{ formatAccount(acc) }}</span>
        </div>
      </div>
    </div>

    <button
      @click="adding = true"
      :disabled="categories.length === 0 || currencies.length === 0"
      class="fixed bottom-20 right-4 bg-green-500 text-white rounded-full shadow-lg w-14 h-14 text-3xl mb-4"
    >
      +
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../../supabase';
import { Eye, EyeOff } from 'lucide-vue-next';
import {
  asMinor,
  convertMinor,
  formatMinor,
  minorDigits,
} from '../../money.js';
import { fetchUahRates, formatRateDate } from '../../rates.js';
import AddAccount from './AddAccount.vue';

const categories = ref([]);
const currencies = ref([]);
const listsReady = ref(false);
const listsError = ref('');

const adding = ref(false);
const showTotal = ref(true);
const collapsedCategories = ref([]);
const accounts = ref([]);
const rates = ref(null);
const ratesStatus = ref('loading');
const ratesError = ref('');

async function fetchAccounts() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    accounts.value = [];
    return;
  }

  const { data, error } = await supabase.from('accounts').select('*');
  if (error) console.error(error);
  else accounts.value = data;
}

async function loadRates() {
  ratesStatus.value = 'loading';
  ratesError.value = '';
  try {
    rates.value = await fetchUahRates();
    ratesStatus.value = 'ready';
  } catch (error) {
    ratesStatus.value = 'error';
    ratesError.value = error?.message || 'Не вдалося отримати курс';
  }
}

async function fetchLists() {
  listsError.value = '';
  const [categoryResult, currencyResult] = await Promise.all([
    supabase.from('accounts_category').select('name').order('id'),
    supabase.from('currency').select('name').order('id'),
  ]);

  if (categoryResult.error || currencyResult.error) {
    listsError.value =
      categoryResult.error?.message || currencyResult.error?.message;
    listsReady.value = true;
    return;
  }

  categories.value = categoryResult.data.map((row) => row.name);
  currencies.value = currencyResult.data.map((row) => row.name);
  listsReady.value = true;
}

onMounted(() => {
  fetchAccounts();
  fetchLists();
  loadRates();
});

function accountMinor(acc) {
  return asMinor(acc.amount_minor);
}

const totalState = computed(() => {
  if (
    accounts.value.length > 0 &&
    accounts.value.every((acc) => acc.amount_minor == null)
  ) {
    return { kind: 'unmigrated' };
  }

  const missing = new Set();
  let sum = 0n;
  let usedForeign = false;
  let nbuDate = null;
  let btcDate = null;

  for (const acc of accounts.value) {
    const currency = String(acc.currency || '').toUpperCase();
    const minor = accountMinor(acc);
    if (minor == null || minorDigits(currency) == null) {
      missing.add(currency || '?');
      continue;
    }

    if (currency === 'UAH') {
      sum += minor;
      continue;
    }

    const quote = rates.value?.[currency];
    if (!quote) {
      if (ratesStatus.value === 'loading') return { kind: 'loading' };
      missing.add(currency);
      continue;
    }

    const converted = convertMinor(minor, currency, 'UAH', quote.perUnit);
    if (converted == null) {
      missing.add(currency);
      continue;
    }

    sum += converted;
    usedForeign = true;
    if (currency === 'BTC') btcDate = quote.date;
    else nbuDate = quote.date;
  }

  if (missing.size) {
    return {
      kind: ratesStatus.value === 'error' ? 'error' : 'missing',
      currencies: [...missing],
      message: ratesError.value,
    };
  }

  return { kind: 'ok', sum, usedForeign, nbuDate, btcDate };
});

const totalText = computed(() => {
  const state = totalState.value;
  if (state.kind === 'loading') return '…';
  if (state.kind === 'unmigrated') return '—';
  if (state.kind === 'ok') return formatMinor(state.sum, 'UAH');
  return 'Немає курсу';
});

const totalNote = computed(() => {
  const state = totalState.value;
  const notes = [];
  if (state.kind === 'unmigrated') {
    notes.push('Запустіть міграцію amount_minor у Supabase.');
  }
  if (state.kind === 'missing' || state.kind === 'error') {
    const currencies = state.currencies?.join(', ');
    notes.push(currencies ? `Немає курсу: ${currencies}` : state.message);
  }
  if (state.kind === 'ok' && state.usedForeign) {
    const parts = ['Оцінка'];
    if (state.nbuDate) parts.push(`курс НБУ на ${formatRateDate(state.nbuDate)}`);
    if (state.btcDate) parts.push(`BTC на ${formatRateDate(state.btcDate)}`);
    notes.push(parts.join(' · '));
  }
  return notes.filter(Boolean).join('\n');
});

// === Групування рахунків за категоріями ===
const groupedAccounts = computed(() => {
  const groups = Object.fromEntries(
    categories.value.map((category) => [category, []])
  );
  for (const acc of accounts.value) {
    if (!groups[acc.category]) groups[acc.category] = [];
    groups[acc.category].push(acc);
  }
  return groups;
});

// === Функції ===
function formatAccount(acc) {
  const currency = String(acc.currency || '').toUpperCase();
  const minor = accountMinor(acc);
  if (minor == null || minorDigits(currency) == null) return '—';
  return formatMinor(minor, currency);
}

function toggleTotal() {
  showTotal.value = !showTotal.value;
}

function toggleCategory(category) {
  if (collapsedCategories.value.includes(category)) {
    collapsedCategories.value = collapsedCategories.value.filter(
      (c) => c !== category
    );
  } else {
    collapsedCategories.value.push(category);
  }
}

function isCollapsed(category) {
  return collapsedCategories.value.includes(category);
}

function onAccountSaved(account) {
  accounts.value.push(account);
  adding.value = false;
}
</script>
