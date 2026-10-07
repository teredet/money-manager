<template>
  <div class="w-full p-4 pb-20">
    <div class="mb-4 flex w-full items-center">
      <button
        type="button"
        class="mr-auto text-sm text-gray-400"
        @click="$emit('cancel')"
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
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue';
import { Wallet } from 'lucide-vue-next';
import { supabase } from '../../supabase';
import { formatMinor, parseMajorToMinor } from '../../money.js';

const props = defineProps({
  accounts: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['cancel', 'saved']);

const entryTypes = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

const entryType = ref('expense');
const entryCategory = ref('');
const entryAmount = ref('');
const entryDate = ref(new Date().toISOString().slice(0, 10));
const entryNote = ref('');
const selectedAccountId = ref('');
const accountListOpen = ref(false);
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

const selectedAccount = computed(() =>
  props.accounts.find(
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

watchEffect(() => {
  if (!props.accounts.length) {
    selectedAccountId.value = '';
    return;
  }

  const hasSelected = props.accounts.some(
    (account) => String(account.id) === selectedAccountId.value,
  );

  if (!selectedAccountId.value || !hasSelected) {
    selectedAccountId.value = String(props.accounts[0].id);
  }

  if (currentCategories.value.length && !entryCategory.value) {
    entryCategory.value = currentCategories.value[0];
  }
});

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

  entryCategory.value = currentCategories.value[0] ?? '';
  entryAmount.value = '';
  entryDate.value = new Date().toISOString().slice(0, 10);
  entryNote.value = '';
  emit('saved');
}
</script>
