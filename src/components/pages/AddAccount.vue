<template>
  <div class="mx-auto flex w-full max-w-[960px] justify-center p-4 pb-20">
    <form
      class="w-full max-w-md rounded-xl bg-zinc-900 p-4 text-left shadow-sm"
      @submit.prevent="submit"
    >
      <div class="mb-4 flex items-center justify-between">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-xl text-zinc-200 transition hover:bg-zinc-800"
          aria-label="Back"
          @click="emit('cancel')"
        >
          ←
        </button>
        <h2 class="text-xl font-bold text-white">New account</h2>
        <button
          type="submit"
          :disabled="busy"
          class="flex h-9 w-9 items-center justify-center rounded-full text-xl font-semibold text-green-400 transition hover:bg-zinc-800 disabled:opacity-60"
          aria-label="Save account"
        >
          +
        </button>
      </div>

      <label class="mb-1 block text-sm text-zinc-300" for="account-name"
        >Назва</label
      >
      <input
        id="account-name"
        v-model="name"
        class="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-0 placeholder:text-zinc-500"
        type="text"
        autocomplete="off"
        required
      />

      <label class="mb-1 block text-sm text-zinc-300" for="account-category"
        >Категорія</label
      >
      <select
        id="account-category"
        v-model="category"
        class="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
        required
      >
        <option v-for="item in categories" :key="item" :value="item">
          {{ item }}
        </option>
      </select>

      <label class="mb-1 block text-sm text-zinc-300" for="account-currency"
        >Валюта</label
      >
      <select
        id="account-currency"
        v-model="currency"
        class="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
        required
      >
        <option v-for="code in currencies" :key="code" :value="code">
          {{ code }}
        </option>
      </select>
      <p v-if="!currencyReady" class="mb-3 text-sm text-gray-500">
        {{
          ratesStatus === 'loading'
            ? 'Курс ще завантажується.'
            : 'Немає курсу для цієї валюти.'
        }}
      </p>

      <label class="mb-1 block text-sm text-zinc-300" for="account-amount"
        >Сума</label
      >
      <input
        id="account-amount"
        v-model="amount"
        class="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none placeholder:text-zinc-500"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        required
      />

      <p v-if="errorMessage" class="mb-3 text-sm text-red-600">
        {{ errorMessage }}
      </p>
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
