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
          type="text"
          inputmode="decimal"
          autocomplete="off"
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
import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import { Wallet } from 'lucide-vue-next';
import { asMinor, formatMinor, minorDigits } from '../../money.js';
import { getDefaultAccountId } from '../../defaultAccount.js';
import { createTransaction } from '../../data/transactions.js';
import { loadDefaultAccounts } from '../../data/settings.js';
import { categoriesForKind, todayIsoDate } from '../../data/validate.js';

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
const entryDate = ref(todayIsoDate());
const entryNote = ref('');
const selectedAccountId = ref('');
const accountListOpen = ref(false);
const entryError = ref('');
const defaultAccounts = ref({ income: null, expense: null });
const defaultsReady = ref(false);

const entryTypeLabel = computed(
  () =>
    entryTypes.find((type) => type.id === entryType.value)?.label ?? 'Expense',
);

const currentCategories = computed(() => categoriesForKind(entryType.value));

const selectedAccount = computed(() =>
  props.accounts.find(
    (account) => String(account.id) === selectedAccountId.value,
  ),
);

function selectAccount(account) {
  selectedAccountId.value = String(account.id);
  accountListOpen.value = false;
}

function formatAccount(account) {
  const currency = String(account?.currency || '').toUpperCase();
  const amountMinor = asMinor(account?.amount_minor);

  if (amountMinor == null || minorDigits(currency) == null) return '—';
  return formatMinor(amountMinor, currency);
}

function applyDefaultAccount(type) {
  const defaultAccountId = getDefaultAccountId(
    type,
    props.accounts,
    defaultAccounts.value,
  );
  selectedAccountId.value =
    defaultAccountId == null ? '' : String(defaultAccountId);
}

onMounted(async () => {
  try {
    defaultAccounts.value = await loadDefaultAccounts();
  } catch (error) {
    console.error(error);
  } finally {
    defaultsReady.value = true;
  }
});

watch(
  () => entryType.value,
  (nextType) => {
    if (!defaultsReady.value) return;
    applyDefaultAccount(nextType);
    const categories = categoriesForKind(nextType);
    if (!categories.includes(entryCategory.value)) {
      entryCategory.value = categories[0] ?? '';
    }
  },
);

watchEffect(() => {
  if (!props.accounts.length) {
    selectedAccountId.value = '';
    return;
  }

  if (!defaultsReady.value) return;

  const hasSelected = props.accounts.some(
    (account) => String(account.id) === selectedAccountId.value,
  );

  if (!selectedAccountId.value || !hasSelected) {
    applyDefaultAccount(entryType.value);
  }

  if (currentCategories.value.length && !entryCategory.value) {
    entryCategory.value = currentCategories.value[0];
  }
});

async function saveEntry() {
  entryError.value = '';

  try {
    await createTransaction({
      accounts: props.accounts,
      accountId: selectedAccountId.value,
      kind: entryType.value,
      category: entryCategory.value,
      amount: entryAmount.value,
      occurredOn: entryDate.value,
      note: entryNote.value,
    });
  } catch (error) {
    if (error?.name !== 'DataError') console.error(error);
    entryError.value = error.message || 'Не вдалося зберегти транзакцію';
    return;
  }

  entryCategory.value = currentCategories.value[0] ?? '';
  entryAmount.value = '';
  entryDate.value = todayIsoDate();
  entryNote.value = '';
  emit('saved');
}
</script>
