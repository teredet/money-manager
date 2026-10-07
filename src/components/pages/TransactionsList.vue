<template>
  <div class="w-full p-4 pb-20">
    <div class="mb-4 flex items-center justify-between">
      <button
        type="button"
        class="text-sm text-gray-400"
        @click="$emit('back')"
      >
        ← Back
      </button>
      <div class="text-center text-sm font-medium text-white">
        {{ title }}
      </div>
      <div class="w-12" aria-hidden="true"></div>
    </div>

    <div v-if="transactions.length" class="space-y-3">
      <div
        v-for="group in groupedTransactions"
        :key="group.date"
        class="space-y-2"
      >
        <div
          class="px-1 text-xs font-medium uppercase tracking-wide text-zinc-400"
        >
          {{ group.label }}
        </div>

        <div
          v-for="transaction in group.items"
          :key="transaction.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-white">
              {{ transaction.category }}
            </div>
            <div class="text-[11px] text-gray-400">
              {{ getAccountName(transaction.account_id) }}
            </div>
          </div>

          <div class="text-right">
            <div
              :class="[
                'text-sm font-semibold',
                transaction.kind === 'expense'
                  ? 'text-red-400'
                  : 'text-green-400',
              ]"
            >
              {{ transaction.kind === 'expense' ? '-' : '+' }}
              {{
                formatMinorValue(transaction.amount_minor, transaction.currency)
              }}
            </div>
            <div
              v-if="getUahEquivalentText(transaction)"
              class="text-[10px] text-gray-400"
            >
              {{ getUahEquivalentText(transaction) }}
            </div>
            <div v-else-if="transaction.note" class="text-[10px] text-gray-500">
              {{ transaction.note }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center text-sm text-gray-400"
    >
      No transactions
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { convertMinor, formatMinor } from '../../money.js';

const props = defineProps({
  transactions: {
    type: Array,
    default: () => [],
  },
  accounts: {
    type: Array,
    default: () => [],
  },
  rates: {
    type: Object,
    default: () => ({}),
  },
  kind: {
    type: String,
    default: 'expense',
  },
  category: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['back']);

const title = props.category
  ? props.category
  : props.kind === 'expense'
    ? 'Expenses'
    : 'Income';

const accountLookup = computed(
  () =>
    new Map(
      props.accounts.map((account) => [Number(account.id), account.name]),
    ),
);

const groupedTransactions = computed(() => {
  const groups = new Map();

  for (const transaction of [...props.transactions].sort(
    (a, b) => new Date(b.occurred_on) - new Date(a.occurred_on),
  )) {
    const dateKey = transaction.occurred_on || 'unknown';
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dateKey,
        label: formatDateHeader(dateKey),
        items: [],
      });
    }

    groups.get(dateKey).items.push(transaction);
  }

  return [...groups.values()];
});

function formatDateHeader(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDate(value) {
  return formatDateHeader(value);
}

function getAccountName(accountId) {
  if (accountId === null || accountId === undefined) return 'Account';
  return accountLookup.value.get(Number(accountId)) || 'Account';
}

function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (value === null || value === undefined) return 0n;
  return BigInt(value);
}

function getUahEquivalentText(transaction) {
  const currency = transaction.currency || 'UAH';
  if (!currency || currency === 'UAH') return '';

  const rate = props.rates?.[currency]?.perUnit ?? '1';
  const converted = convertMinor(
    toBigInt(transaction.amount_minor),
    currency,
    'UAH',
    rate,
  );

  if (converted == null) return '';
  return `≈ ${formatMinor(converted, 'UAH')}`;
}

function formatMinorValue(amountMinor, currency) {
  return formatMinor(toBigInt(amountMinor), currency || 'UAH');
}
</script>
