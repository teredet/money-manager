<template>
  <ChangeAccount
    v-if="editingAccount"
    :account="editingAccount"
    :categories="categories"
    :rates="rates"
    :rates-status="ratesStatus"
    @cancel="editingAccount = null"
    @saved="onAccountUpdated"
  />
  <AddAccount
    v-else-if="adding"
    :categories="categories"
    :currencies="currencies"
    :rates="rates"
    :rates-status="ratesStatus"
    @cancel="adding = false"
    @saved="onAccountSaved"
  />
  <div v-else class="mx-auto w-full max-w-[960px] p-4 pb-20">
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
      <div class="flex items-center gap-2">
        <button @click="toggleTotal" class="text-sm text-gray-500">
          <component
            :is="showTotal ? EyeOff : Eye"
            class="w-5 h-5 text-gray-600"
          />
        </button>
        <button
          @click="adding = true"
          :disabled="categories.length === 0 || currencies.length === 0"
          class="flex h-9 w-9 items-center justify-center rounded-full text-xl font-semibold text-green-500 disabled:opacity-50"
          aria-label="Add account"
        >
          +
        </button>
      </div>
    </div>

    <p v-if="listsError" class="mb-3 text-sm text-red-600">{{ listsError }}</p>
    <p v-else-if="!listsReady" class="mb-3 text-sm text-gray-500">
      Завантаження…
    </p>

    <!-- Categories -->
    <div
      v-for="(accounts, category) in groupedAccounts"
      :key="category"
      class="mb-3 rounded-lg bg-zinc-900 shadow-sm"
    >
      <button
        class="w-full text-left p-3 flex justify-between items-center"
        @click="toggleCategory(category)"
      >
        <span class="font-semibold text-white">{{ category }}</span>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-300">{{
            categoryTotal(accounts)
          }}</span>
          <span class="text-zinc-400">
            {{ isCollapsed(category) ? '+' : '–' }}
          </span>
        </div>
      </button>

      <div
        v-show="!isCollapsed(category)"
        class="border-t border-zinc-700 px-3 py-2"
      >
        <p v-if="accounts.length === 0" class="py-2 text-sm text-gray-500">
          Немає рахунків
        </p>
        <button
          v-for="acc in accounts"
          :key="acc.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 border-b border-zinc-700 py-1 text-left last:border-none hover:bg-zinc-800/50"
          @click="startEditing(acc)"
        >
          <div class="flex items-center gap-2">
            <Wallet class="h-4 w-4 text-zinc-400" />
            <span class="text-white">{{ acc.name }}</span>
          </div>

          <span class="font-medium text-white">{{ formatAccount(acc) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue';
import { supabase } from '../../supabase';
import { Eye, EyeOff, Wallet } from 'lucide-vue-next';
import {
  asMinor,
  convertMinor,
  formatMinor,
  minorDigits,
} from '../../money.js';
import { fetchUahRates, formatRateDate } from '../../rates.js';
import AddAccount from './AddAccount.vue';
import ChangeAccount from './ChangeAccount.vue';

const categories = ref([]);
const currencies = ref([]);
const listsReady = ref(false);
const listsError = ref('');

const adding = ref(false);
const editingAccount = ref(null);
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
  fetchLists();
  loadRates();
});

onActivated(fetchAccounts);

function accountMinor(acc) {
  return asMinor(acc.amount_minor);
}

function categoryTotal(items) {
  if (!items || items.length === 0) return '₴0';

  let sum = 0n;

  for (const acc of items) {
    const minor = accountMinor(acc);
    const currency = String(acc.currency || '').toUpperCase();

    if (minor == null || minorDigits(currency) == null) continue;

    if (currency === 'UAH') {
      sum += minor;
      continue;
    }

    const quote = rates.value?.[currency];
    if (!quote) continue;

    const converted = convertMinor(minor, currency, 'UAH', quote.perUnit);
    if (converted != null) sum += converted;
  }

  return formatMinor(sum, 'UAH');
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

const totalUsd = computed(() => {
  const state = totalState.value;
  if (state.kind !== 'ok' || state.sum == null || !rates.value?.USD?.perUnit)
    return null;

  const usdRate = Number(rates.value.USD.perUnit);
  if (!Number.isFinite(usdRate) || usdRate <= 0) return null;

  const usdMinor = convertMinor(
    state.sum,
    'UAH',
    'USD',
    (1 / usdRate).toString(),
  );
  return usdMinor;
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
    const parts = [];
    if (totalUsd.value != null) {
      parts.push(`${formatMinor(totalUsd.value, 'USD')}`);
    }
    if (state.nbuDate)
      parts.push(`курс НБУ на ${formatRateDate(state.nbuDate)}`);
    if (state.btcDate) parts.push(`BTC на ${formatRateDate(state.btcDate)}`);
    if (parts.length) notes.push(parts.join(' · '));
  }
  return notes.filter(Boolean).join('\n');
});

// === Групування рахунків за категоріями ===
const groupedAccounts = computed(() => {
  const groups = Object.fromEntries(
    categories.value.map((category) => [category, []]),
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
      (c) => c !== category,
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

function startEditing(account) {
  editingAccount.value = account;
}

function onAccountUpdated(account) {
  const index = accounts.value.findIndex((item) => item.id === account.id);
  if (index >= 0) {
    accounts.value.splice(index, 1, account);
  } else {
    accounts.value.push(account);
  }
  editingAccount.value = null;
}
</script>
