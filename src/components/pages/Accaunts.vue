<template>
  <div class="p-4 pb-20 w-[80vw]">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <div v-if="showTotal" class="text-3xl font-semibold text-green-600">
        {{ formatCurrency(totalInBase, baseCurrency) }}
      </div>
      <div
        v-else-if="!showTotal"
        class="text-3xl font-semibold text-green-600 text-center"
      >
        **********
      </div>
      <button @click="toggleTotal" class="text-sm text-gray-500">
        <component
          :is="showTotal ? EyeOff : Eye"
          class="w-5 h-5 text-gray-600"
        />
      </button>
    </div>

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
        <div
          v-for="acc in accounts"
          :key="acc.id"
          class="flex justify-between py-1 border-b last:border-none"
        >
          <span class="text-white">{{ acc.name }}</span>
          <span class="font-medium text-white">{{
            formatCurrency(acc.amount, acc.currency)
          }}</span>
        </div>
      </div>
    </div>

    <button
      @click="addAccount"
      class="fixed bottom-20 right-4 bg-green-500 text-white rounded-full shadow-lg w-14 h-14 text-3xl mb-4"
    >
      +
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../../supabase';
import getSymbolFromCurrency from 'currency-symbol-map';

import { Eye, EyeOff } from 'lucide-vue-next';

const baseCurrency = ref('UAH');
const showTotal = ref(true);
const collapsedCategories = ref([]);

// === Курс валют (відносно UAH) (mock) ===
// *Пізніше можна замінити на API (наприклад, exchangerate.host)*
const exchangeRates = ref({
  UAH: 1,
  USD: 42,
  EUR: 45,
  BTC: 2500000,
});

const accounts = ref([]);
async function fetchAccounts() {
  const { data, error } = await supabase.from('accounts').select('*');
  if (error) console.error(error);
  else accounts.value = data;
}

onMounted(() => {
  fetchAccounts();
});

// === Стани ===

// === Обчислення загальної суми ===
const totalInBase = computed(() => {
  return accounts.value.reduce((sum, acc) => {
    const rate = exchangeRates.value[acc.currency] || 1;
    return sum + acc.amount * rate;
  }, 0);
});

// === Групування рахунків за категоріями ===
const groupedAccounts = computed(() => {
  const groups = {};
  for (const acc of accounts.value) {
    if (!groups[acc.category]) groups[acc.category] = [];
    groups[acc.category].push(acc);
  }
  return groups;
});

// === Функції ===
function formatCurrency(amount, code) {
  const symbol = getSymbolFromCurrency(code) || code;
  const number = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);

  return `${symbol} ${number}`;
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

async function addAccount() {
  //temporary prompt-based
  const name = prompt('Назва рахунку:');
  const category = prompt('Категорія:');
  const currency = prompt('Валюта (UAH, USD, EUR, BTC):', 'UAH');
  const amount = Number(prompt('Сума:'));
  if (!name || !category || !currency || isNaN(amount)) return;

  const { data, error } = await supabase
    .from('accounts')
    .insert([{ name, category, currency: currency.toUpperCase(), amount }])
    .select();

  if (error) console.error(error);
  else accounts.value.push(data[0]);
}
</script>
