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
        New account
      </h2>
      <span class="w-12" aria-hidden="true"></span>
    </div>

    <form class="space-y-3" @submit.prevent="submit">
      <div>
        <label class="mb-1 block text-sm text-gray-300" for="account-name"
          >Name</label
        >
        <input
          id="account-name"
          v-model="name"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          type="text"
          autocomplete="off"
          placeholder="Cash, Savings..."
          required
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-gray-300" for="account-category"
          >Category</label
        >
        <select
          id="account-category"
          v-model="category"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          required
        >
          <option v-for="item in categories" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm text-gray-300" for="account-currency"
          >Currency</label
        >
        <select
          id="account-currency"
          v-model="currency"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          required
        >
          <option v-for="code in currencies" :key="code" :value="code">
            {{ code }}
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
        <label class="mb-1 block text-sm text-gray-300" for="account-amount"
          >Amount</label
        >
        <input
          id="account-amount"
          v-model="amount"
          type="number"
          min="0"
          step="0.01"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          placeholder="0.00"
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
import { computed, ref } from 'vue';
import { supabase } from '../../supabase';
import { parseMajorToMinor } from '../../money.js';

const props = defineProps({
  categories: {
    type: Array,
    required: true,
  },
  currencies: {
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
const category = ref(props.categories[0] ?? '');
const currency = ref(
  props.currencies.includes('UAH') ? 'UAH' : (props.currencies[0] ?? ''),
);
const amount = ref('');
const errorMessage = ref('');
const busy = ref(false);

const currencyReady = computed(() => {
  if (currency.value === 'UAH') return true;
  return Boolean(props.rates?.[currency.value]);
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
  if (!props.currencies.includes(currency.value)) {
    errorMessage.value = 'Невідома валюта';
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
    errorMessage.value = 'Увійдіть, щоб зберегти рахунок';
    return;
  }

  busy.value = true;
  const { data, error } = await supabase
    .from('accounts')
    .insert([
      {
        name: trimmedName,
        category: category.value,
        currency: currency.value,
        amount_minor: amountMinor.toString(),
      },
    ])
    .select();
  busy.value = false;

  if (error) {
    console.error(error);
    errorMessage.value = error.message;
    return;
  }

  emit('saved', data[0]);
}
</script>
