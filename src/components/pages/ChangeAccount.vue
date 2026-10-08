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
          type="text"
          inputmode="decimal"
          autocomplete="off"
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
import { formatMinorInput } from '../../money.js';
import { updateAccount } from '../../data/accounts.js';

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

watchEffect(() => {
  if (!props.account) return;
  name.value = props.account.name ?? '';
  category.value = props.account.category ?? props.categories[0] ?? '';
  currency.value = props.account.currency ?? '';
  amount.value = formatMinorInput(
    props.account.amount_minor,
    props.account.currency ?? currency.value,
  );
});

async function submit() {
  errorMessage.value = '';

  if (!currencyReady.value) {
    errorMessage.value = 'Немає курсу для цієї валюти';
    return;
  }

  busy.value = true;
  try {
    const saved = await updateAccount(props.account, {
      name: name.value,
      category: category.value,
      currency: currency.value,
      amount: amount.value,
      categories: props.categories,
    });
    emit('saved', saved);
  } catch (error) {
    if (error?.name !== 'DataError') console.error(error);
    errorMessage.value = error.message;
  } finally {
    busy.value = false;
  }
}
</script>
