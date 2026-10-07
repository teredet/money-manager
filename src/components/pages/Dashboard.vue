<template>
  <div v-if="adding" class="w-full p-4 pb-20">
    <div class="mb-4 flex w-full items-center">
      <button
        type="button"
        class="mr-auto text-sm text-gray-400"
        @click="adding = false"
      >
        ←
      </button>
      <h2 class="flex-1 text-center text-lg font-semibold text-white">
        Add transaction
      </h2>
      <span class="w-12" aria-hidden="true"></span>
    </div>

    <div class="mb-4 grid w-full grid-cols-2 gap-2">
      <button
        v-for="type in entryTypes"
        :key="type.id"
        type="button"
        @click="entryType = type.id"
        :class="[
          'w-full rounded-full border px-3 py-2 text-sm font-medium transition-colors',
          entryType === type.id
            ? type.id === 'expense'
              ? 'border-red-500 bg-red-500/10 text-red-300'
              : 'border-green-500 bg-green-500/10 text-green-300'
            : 'border-zinc-700 bg-zinc-900 text-gray-300',
        ]"
      >
        {{ type.label }}
      </button>
    </div>

    <form class="space-y-3" @submit.prevent="saveEntry">
      <div>
        <label class="mb-1 block text-sm text-gray-300" for="entry-amount"
          >Amount</label
        >
        <input
          id="entry-amount"
          v-model="entryAmount"
          type="number"
          min="0"
          step="0.01"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          placeholder="0.00"
          required
        />
      </div>

      <div v-if="accounts.length">
        <label class="mb-1 block text-sm text-gray-300" for="entry-account"
          >Account</label
        >

        <div class="space-y-2">
          <button
            type="button"
            @click="accountListOpen = !accountListOpen"
            class="w-full rounded-lg border border-emerald-500 bg-emerald-500/10 p-2 text-left transition-colors"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-200"
                >
                  <Wallet class="h-3.5 w-3.5" />
                </div>

                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-white">
                    {{ selectedAccount?.name || 'Select account' }}
                  </div>
                </div>
              </div>

              <div class="text-right text-sm font-semibold text-white">
                {{ selectedAccount ? formatAccount(selectedAccount) : '—' }}
              </div>
            </div>
          </button>

          <div v-if="accountListOpen" class="space-y-2">
            <button
              v-for="account in accounts"
              :key="account.id"
              type="button"
              @click="selectAccount(account)"
              :class="[
                'w-full rounded-lg border p-2 text-left transition-colors',
                selectedAccountId === String(account.id)
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 bg-zinc-900',
              ]"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-200"
                  >
                    <Wallet class="h-3.5 w-3.5" />
                  </div>

                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-white">
                      {{ account.name }}
                    </div>
                  </div>
                </div>

                <div class="text-right text-sm font-semibold text-white">
                  {{ formatAccount(account) }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm text-gray-300" for="entry-category"
          >Category</label
        >
        <select
          id="entry-category"
          v-model="entryCategory"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          required
        >
          <option
            v-for="category in currentCategories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm text-gray-300" for="entry-date"
          >Date</label
        >
        <input
          id="entry-date"
          v-model="entryDate"
          type="date"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-gray-300" for="entry-note"
          >Note</label
        >
        <textarea
          id="entry-note"
          v-model="entryNote"
          rows="3"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          placeholder="Optional note"
        />
      </div>

      <p v-if="entryError" class="text-sm text-red-500">{{ entryError }}</p>

      <button
        type="submit"
        class="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-white"
      >
        Save {{ entryTypeLabel }}
      </button>
    </form>
  </div>

  <div v-else class="w-full p-4">
    <TransactionsList
      v-if="activeTransactionKind"
      :transactions="transactionList"
      :accounts="accounts"
      :rates="rates"
      :kind="activeTransactionKind"
      :category="activeTransactionCategory"
      @back="clearTransactionsView"
    />

    <template v-else>
      <div class="mb-4 flex items-center justify-between gap-2">
        <div class="grid w-full grid-cols-2 gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="selectedTab = tab.id"
            :class="[
              'w-full rounded-full border px-3 py-2 text-sm font-medium transition-colors',
              selectedTab === tab.id
                ? tab.id === 'expense'
                  ? 'border-red-500 bg-red-500/10 text-red-300'
                  : 'border-green-500 bg-green-500/10 text-green-300'
                : 'border-zinc-700 bg-zinc-900 text-gray-300',
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="mb-4 grid w-full grid-cols-4 gap-2">
        <button
          v-for="period in periods"
          :key="period.id"
          type="button"
          @click="selectedPeriod = period.id"
          :class="[
            'w-full rounded-full border px-2 py-2 text-xs font-medium transition-colors',
            selectedPeriod === period.id
              ? 'border-white bg-white text-black'
              : 'border-zinc-700 bg-zinc-900 text-gray-300',
          ]"
        >
          {{ period.label }}
        </button>
      </div>

      <div class="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3">
        <button
          v-if="selectedTab === 'expense'"
          type="button"
          @click="openTransactions(selectedTab, null)"
          class="mb-3 block w-full rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-left"
        >
          <div class="mt-1 text-center text-2xl font-bold text-red-400">
            {{ currentOverviewText }}
          </div>
        </button>
        <button
          v-else
          type="button"
          @click="openTransactions(selectedTab, null)"
          class="mb-3 block w-full rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-left"
        >
          <div class="mt-1 text-center text-2xl font-bold text-green-400">
            {{ currentOverviewText }}
          </div>
        </button>

        <div v-if="selectedTab === 'expense'" class="space-y-3">
          <button
            v-for="item in expenseCategories"
            :key="item.name"
            type="button"
            @click="openTransactions('expense', item.name)"
            class="flex w-full items-center justify-between gap-3 rounded-lg bg-zinc-800/80 p-3 text-left"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <span class="font-medium text-white">{{ item.name }}</span>
                <span class="text-xs text-gray-400">({{ item.count }})</span>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 text-right">
              <span
                class="inline-block w-12 text-right text-xs text-gray-500"
                >{{ item.share }}</span
              >
              <span
                class="inline-block w-28 text-right font-semibold text-red-400"
                >{{ item.amount }}</span
              >
            </div>
          </button>
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="item in incomeCategories"
            :key="item.name"
            type="button"
            @click="openTransactions('income', item.name)"
            class="flex w-full items-center justify-between gap-3 rounded-lg bg-zinc-800/80 p-3 text-left"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <span class="font-medium text-white">{{ item.name }}</span>
                <span class="text-xs text-gray-400">({{ item.count }})</span>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 text-right">
              <span
                class="inline-block w-12 text-right text-xs text-gray-500"
                >{{ item.share }}</span
              >
              <span
                class="inline-block w-28 text-right font-semibold text-green-400"
                >{{ item.amount }}</span
              >
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        @click="adding = true"
        class="fixed bottom-20 right-4 mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-lg"
      >
        +
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watchEffect } from 'vue';
import { Wallet } from 'lucide-vue-next';
import { supabase } from '../../supabase';
import { convertMinor, formatMinor, parseMajorToMinor } from '../../money.js';
import { fetchUahRates } from '../../rates.js';
import TransactionsList from './TransactionsList.vue';

const tabs = [
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
];

const periods = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const entryTypes = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

const selectedTab = ref('expense');
const selectedPeriod = ref('month');
const adding = ref(false);
const entryType = ref('expense');
const entryCategory = ref('');
const entryAmount = ref('');
const entryDate = ref(new Date().toISOString().slice(0, 10));
const entryNote = ref('');
const accounts = ref([]);
const selectedAccountId = ref('');
const transactions = ref([]);
const rates = ref({});
const loadingTransactions = ref(false);
const transactionsError = ref('');
const entryError = ref('');

const entryTypeLabel = computed(
  () =>
    entryTypes.find((type) => type.id === entryType.value)?.label ?? 'Expense',
);

const currentCategories = computed(() => {
  if (entryType.value === 'income')
    return ['Salary', 'Freelance', 'Investments', 'Other'];
  return ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];
});

const accountListOpen = ref(false);

const selectedAccount = computed(() =>
  accounts.value.find(
    (account) => account.id === Number(selectedAccountId.value),
  ),
);

function selectAccount(account) {
  selectedAccountId.value = String(account.id);
  accountListOpen.value = false;
}

function formatAccount(account) {
  const currency = String(account?.currency || '').toUpperCase();
  const amountMinor = account?.amount_minor;

  if (amountMinor == null || !currency) return '—';
  return formatMinor(BigInt(amountMinor), currency);
}

function startOfPeriod(periodId) {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );

  if (periodId === 'day') return start;

  if (periodId === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return start;
  }

  if (periodId === 'month') {
    start.setDate(1);
    return start;
  }

  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

const filteredTransactions = computed(() => {
  const periodStart = startOfPeriod(selectedPeriod.value);

  return transactions.value.filter((transaction) => {
    const date = new Date(`${transaction.occurred_on}T00:00:00`);
    return date >= periodStart && date <= new Date();
  });
});

function convertToUahMinor(amountMinor, currency) {
  const rate = rates.value[currency]?.perUnit ?? '1';
  const converted = convertMinor(BigInt(amountMinor), currency, 'UAH', rate);
  return converted ?? 0n;
}

const expenseCategories = computed(() => {
  const rows = filteredTransactions.value.filter((t) => t.kind === 'expense');
  const total = rows.reduce(
    (sum, item) => sum + convertToUahMinor(item.amount_minor, item.currency),
    0n,
  );

  const grouped = new Map();
  for (const item of rows) {
    const existing = grouped.get(item.category) ?? {
      name: item.category,
      total: 0n,
      count: 0,
    };
    existing.total += convertToUahMinor(item.amount_minor, item.currency);
    existing.count += 1;
    grouped.set(item.category, existing);
  }

  return [...grouped.values()]
    .map((item) => ({
      name: item.name,
      count: item.count,
      total: item.total,
      share:
        total === 0n
          ? '0%'
          : `${Math.round((Number(item.total) / Number(total)) * 100)}%`,
      amount: formatMinor(item.total, 'UAH'),
    }))
    .sort((a, b) => Number(b.total - a.total));
});

const incomeCategories = computed(() => {
  const rows = filteredTransactions.value.filter((t) => t.kind === 'income');
  const total = rows.reduce(
    (sum, item) => sum + convertToUahMinor(item.amount_minor, item.currency),
    0n,
  );

  const grouped = new Map();
  for (const item of rows) {
    const existing = grouped.get(item.category) ?? {
      name: item.category,
      total: 0n,
      count: 0,
    };
    existing.total += convertToUahMinor(item.amount_minor, item.currency);
    existing.count += 1;
    grouped.set(item.category, existing);
  }

  return [...grouped.values()]
    .map((item) => ({
      name: item.name,
      count: item.count,
      total: item.total,
      share:
        total === 0n
          ? '0%'
          : `${Math.round((Number(item.total) / Number(total)) * 100)}%`,
      amount: formatMinor(item.total, 'UAH'),
    }))
    .sort((a, b) => Number(b.total - a.total));
});

const currentOverviewAmount = computed(() => {
  const rows = filteredTransactions.value.filter(
    (item) => item.kind === selectedTab.value,
  );
  return rows.reduce(
    (sum, item) => sum + convertToUahMinor(item.amount_minor, item.currency),
    0n,
  );
});

const currentOverviewText = computed(() =>
  formatMinor(currentOverviewAmount.value, 'UAH'),
);

const activeTransactionKind = ref(null);
const activeTransactionCategory = ref(null);

const transactionList = computed(() => {
  const kind = activeTransactionKind.value ?? selectedTab.value;
  let rows = filteredTransactions.value.filter((item) => item.kind === kind);

  if (activeTransactionCategory.value) {
    rows = rows.filter(
      (item) => item.category === activeTransactionCategory.value,
    );
  }

  return [...rows].sort(
    (a, b) => new Date(b.occurred_on) - new Date(a.occurred_on),
  );
});

function openTransactions(kind, category) {
  activeTransactionKind.value = kind;
  activeTransactionCategory.value = category ?? null;
}

function clearTransactionsView() {
  activeTransactionKind.value = null;
  activeTransactionCategory.value = null;
}

async function loadAccounts() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    accounts.value = [];
    selectedAccountId.value = '';
    return;
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    accounts.value = [];
    return;
  }

  accounts.value = data ?? [];
  if (!accounts.value.length) {
    selectedAccountId.value = '';
    return;
  }

  if (
    !selectedAccountId.value ||
    !accounts.value.some(
      (account) => account.id === Number(selectedAccountId.value),
    )
  ) {
    selectedAccountId.value = String(accounts.value[0].id);
  }
}

async function loadRates() {
  try {
    rates.value = await fetchUahRates();
  } catch (error) {
    console.error(error);
    rates.value = { UAH: { perUnit: '1' } };
  }
}

async function loadTransactions() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    transactions.value = [];
    return;
  }

  loadingTransactions.value = true;
  transactionsError.value = '';

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('occurred_on', { ascending: false });

  loadingTransactions.value = false;

  if (error) {
    console.error(error);
    transactionsError.value = 'Не вдалося завантажити транзакції';
    transactions.value = [];
    return;
  }

  transactions.value = data ?? [];
}

async function saveEntry() {
  entryError.value = '';

  if (!selectedAccountId.value) {
    entryError.value = 'Додайте рахунок, щоб створити транзакцію';
    return;
  }

  const account = selectedAccount.value;
  if (!account) {
    entryError.value = 'Обраний рахунок не знайдено';
    return;
  }

  const amountMinor = parseMajorToMinor(entryAmount.value, account.currency);
  if (amountMinor == null || amountMinor <= 0n) {
    entryError.value = 'Некоректна сума';
    return;
  }

  const normalizedAmountMinor = amountMinor > 0n ? amountMinor : -amountMinor;
  const payload = {
    account_id: Number(account.id),
    kind: entryType.value,
    category: entryCategory.value,
    amount_minor: Number(normalizedAmountMinor),
    occurred_on: entryDate.value || new Date().toISOString().slice(0, 10),
    note: entryNote.value.trim() || null,
  };

  try {
    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) {
      console.error(error);
      entryError.value = error.message;
      return;
    }
  } catch (error) {
    console.error(error);
    entryError.value = 'Не вдалося зберегти транзакцію';
    return;
  }

  adding.value = false;
  entryCategory.value = currentCategories.value[0] ?? '';
  entryAmount.value = '';
  entryDate.value = new Date().toISOString().slice(0, 10);
  entryNote.value = '';
  await loadTransactions();
}

watchEffect(() => {
  if (currentCategories.value.length && !entryCategory.value) {
    entryCategory.value = currentCategories.value[0];
  }
});

onMounted(async () => {
  await loadRates();
  await loadAccounts();
  await loadTransactions();
});
</script>
