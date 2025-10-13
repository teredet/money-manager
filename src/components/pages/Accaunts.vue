<template>
  <div class="p-4 pb-20">
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
      class="fixed bottom-20 right-4 bg-green-500 text-white rounded-full shadow-lg w-14 h-14 text-3xl"
    >
      +
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';

// === Базова валюта ===
const baseCurrency = ref('UAH');

// === Курс валют (відносно UAH) (mock) ===
// *Пізніше можна замінити на API (наприклад, exchangerate.host)*
const exchangeRates = ref({
  UAH: 1,
  USD: 42,
  EUR: 45,
  BTC: 2500000,
});

// === Дані рахунків (mock) ===
const accounts = ref([
  {
    id: 1,
    name: 'Monobank',
    category: 'Banks',
    amount: 42000,
    currency: 'UAH',
  },
  { id: 1, name: 'Monobank', category: 'Banks', amount: 4200, currency: 'UAH' },
  { id: 1, name: 'Privat', category: 'Banks', amount: 4200, currency: 'UAH' },
  { id: 1, name: 'Raif', category: 'Banks', amount: 4200, currency: 'UAH' },
  { id: 1, name: 'ABank', category: 'Banks', amount: 4200, currency: 'UAH' },
  { id: 1, name: 'Sense', category: 'Banks', amount: 4200, currency: 'UAH' },
  { id: 2, name: 'Revolut', category: 'Banks', amount: 300, currency: 'USD' },
  { id: 3, name: 'Cash', category: 'Cash', amount: 18000, currency: 'UAH' },
  { id: 3, name: 'EUR', category: 'Cash', amount: 250, currency: 'EUR' },
  { id: 3, name: 'USD', category: 'Cash', amount: 250, currency: 'USD' },
  { id: 4, name: 'Binance', category: 'Crypto', amount: 0.01, currency: 'BTC' },
]);

// === Стани ===
const showTotal = ref(true);
const collapsedCategories = ref([]);

// === Обчислення загальної суми ===
const totalInBase = computed(() => {
  return accounts.value.reduce((sum, acc) => {
    const rateToUAH = exchangeRates.value[acc.currency] || 1;
    return sum + acc.amount * rateToUAH;
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
function formatCurrency(amount, currency) {
  return amount.toLocaleString('uk-UA', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
  });
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

function addAccount() {
  //temporary prompt-based
  const name = prompt('Назва рахунку:');
  const category = prompt('Категорія:');
  const amount = Number(prompt('Сума:'));
  const currency = prompt('Валюта (наприклад, UAH, USD):', 'UAH');
  if (!name || !category || isNaN(amount)) return;
  accounts.value.push({
    id: Date.now(),
    name,
    category,
    amount,
    currency,
  });
}
</script>
