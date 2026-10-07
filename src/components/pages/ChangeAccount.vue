<template>
  <div class="w-full p-4 pb-20">
    <div class="mb-4 flex w-full items-center">
      <button
        type="button"
        class="mr-auto text-sm text-gray-400"
        @click="emit('cancel')"
      >
        ←
      </button>
      <h2 class="flex-1 text-center text-lg font-semibold text-white">
        Change account
      </h2>
      <span class="w-12" aria-hidden="true"></span>
    </div>

    <form class="space-y-3" @submit.prevent="submit">
      <div>
        <label
          class="mb-1 block text-sm text-gray-300"
          for="change-account-name"
          >Name</label
        >
        <input
          id="change-account-name"
          v-model="name"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          type="text"
          autocomplete="off"
          required
        />
      </div>

      <div>
        <label
          class="mb-1 block text-sm text-gray-300"
          for="change-account-category"
          >Category</label
        >
        <select
          id="change-account-category"
          v-model="category"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          required
        >
          <option v-for="item in categories" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </div>

      <p v-if="!currencyReady" class="text-sm text-gray-500">
        {{
          ratesStatus === 'loading'
            ? 'Курс ще завантажується.'
            : 'Немає курсу для цієї валюти.'
        }}
      </p>

      <div>
        <label
          class="mb-1 block text-sm text-gray-300"
          for="change-account-amount"
          >Amount</label
        >
        <input
          id="change-account-amount"
          v-model="amount"
          type="number"
          min="0"
          step="0.01"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          required
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-red-500">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        :disabled="busy"
        class="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        Save account
      </button>
    </form>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue';
import { supabase } from '../../supabase';
import { minorDigits, parseMajorToMinor } from '../../money.js';

const props = defineProps({
  account: {
    type: Object,
    required: true,
  },
  categories: {
    type: Array,
    required: true,
  },
  rates: {
    type: Object,
    default: null,
  },
  ratesStatus: {
    type: String,
    default: 'loading',
  },
});

const emit = defineEmits(['cancel', 'saved']);

const name = ref('');
const category = ref('');
const currency = ref('');
const amount = ref('');
const errorMessage = ref('');
const busy = ref(false);

const currencyReady = computed(() => {
  if (currency.value === 'UAH') return true;
  return Boolean(props.rates?.[currency.value]);
});

function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value))
    return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}

function normalizeAmountFromMinor(value, currentCurrency) {
  const digits = minorDigits(currentCurrency);
  if (value == null || digits == null) return '';

  const normalized = typeof value === 'bigint' ? value : BigInt(value);
  const sign = normalized < 0n ? '-' : '';
  const absolute = normalized < 0n ? -normalized : normalized;
  const scale = 10n ** BigInt(digits);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(digits, '0');
  const trimmed = fraction.replace(/0+$/, '');

  return trimmed ? `${sign}${whole}.${trimmed}` : `${sign}${whole}`;
}

watchEffect(() => {
  if (!props.account) return;
  name.value = props.account.name ?? '';
  category.value = props.account.category ?? props.categories[0] ?? '';
  currency.value = props.account.currency ?? '';
  amount.value = normalizeAmountFromMinor(
    props.account.amount_minor,
    props.account.currency ?? currency.value,
  );
});

async function submit() {
  errorMessage.value = '';
  const trimmedName = name.value.trim();

  if (!trimmedName) {
    errorMessage.value = 'Вкажіть назву';
    return;
  }
  if (!props.categories.includes(category.value)) {
    errorMessage.value = 'Невідома категорія';
    return;
  }
  if (!currencyReady.value) {
    errorMessage.value = 'Немає курсу для цієї валюти';
    return;
  }

  const amountMinor = parseMajorToMinor(amount.value, currency.value);
  if (amountMinor == null) {
    errorMessage.value = 'Некоректна сума';
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    errorMessage.value = 'Увійдіть, щоб змінити рахунок';
    return;
  }

  const previousAmountMinor = toBigInt(props.account.amount_minor);
  const accountPayload = {
    name: trimmedName,
    category: category.value,
  };

  busy.value = true;

  const { data, error } = await supabase
    .from('accounts')
    .update(accountPayload)
    .eq('id', props.account.id)
    .select();

  if (error) {
    busy.value = false;
    console.error(error);
    errorMessage.value = error.message;
    return;
  }

  if (previousAmountMinor != null && previousAmountMinor !== amountMinor) {
    const deltaMinor = amountMinor - previousAmountMinor;
    const kind = deltaMinor >= 0n ? 'income' : 'expense';
    const magnitudeMinor = deltaMinor < 0n ? -deltaMinor : deltaMinor;

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          account_id: Number(props.account.id),
          kind,
          category: 'Balance change',
          amount_minor: Number(magnitudeMinor),
          occurred_on: new Date().toISOString().slice(0, 10),
          note: null,
        },
      ]);

    if (transactionError) {
      busy.value = false;
      console.error(transactionError);
      errorMessage.value = transactionError.message;
      return;
    }
  }

  busy.value = false;

  emit('saved', {
    ...props.account,
    ...data[0],
    name: trimmedName,
    category: category.value,
    amount_minor: amountMinor.toString(),
    currency: currency.value,
  });
}
</script>
